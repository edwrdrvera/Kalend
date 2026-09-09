"use client";

import { useState, useEffect, useRef } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventCreatePopover, { type EventFormValues } from "./EventCreatePopover";
import { computePopoverSide } from "@/lib/popover-position";
import type { CalendarView } from "./ViewSwitcher";
import type {
  CalendarEvent,
  CalendarTask,
  CalendarCategory,
  TasksApiResponse,
  CategoriesApiResponse,
  CategoryDeleteApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import {
  beginCategoryDeletion,
  finishCategoryDeletion,
  isCompletedCategoryDeletion,
} from "@/lib/category-deletion";

function ErrorToast({
  message,
  onDismiss,
  onRetry,
}: {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground shadow-lg ring-1 ring-border">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium text-primary transition-colors hover:text-primary/80"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
    </div>
  );
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [mounted, setMounted] = useState(false);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<string[]>([]);

  const events = useCalendarEvents(viewDate);

  // Bumping this triggers a re-fetch of tasks and categories, used by the
  // retry button in error toasts. Events have their own retry via the hook.
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Fetched once on mount, not tied to viewDate like events: the task list
  // panel shows everything (undated + all due dates) rather than a
  // date-scoped window.
  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      setTasksLoading(true);
      setTasksError(null);

      try {
        const res = await fetch("/api/tasks");
        const json: TasksApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load tasks");
        }

        if (!cancelled) {
          setTasks(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setTasksError(
            err instanceof Error ? err.message : "Failed to load tasks"
          );
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Fetched once on mount, same as tasks: categories aren't date-scoped, the
  // full list is needed everywhere a category can be picked or a color
  // looked up.
  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);

      try {
        const res = await fetch("/api/categories");
        const json: CategoriesApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load categories");
        }

        if (!cancelled) {
          setCategories(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setCategoriesError(
            err instanceof Error ? err.message : "Failed to load categories"
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const handleRetry = () => {
    events.retry();
    setRetryCount((c) => c + 1);
  };

  const handleToggleCategoryVisibility = (categoryId: string) => {
    setHiddenCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  // Not optimistic, same reasoning as handleCreateTask: CategoryManager
  // shows its own inline error on failure.
  const handleCreateCategory = async (name: string, color: string) => {
    const json = await mutateResource<CalendarCategory>(
      "/api/categories",
      "POST",
      { name, color },
      "Failed to create category"
    );

    if (!json.data) {
      throw new Error("Failed to create category");
    }

    setCategories((prev) => [...prev, json.data as CalendarCategory]);
  };

  // Optimistic, same pattern as handleToggleTaskComplete: recoloring or
  // renaming updates every event/task under this category immediately,
  // since their display color is looked up live (see resolveDisplayColor),
  // not copied.
  const handleUpdateCategory = async (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => {
    const previousCategory = category;
    const optimisticCategory: CalendarCategory = { ...category, ...updates };

    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? optimisticCategory : c))
    );

    try {
      const json = await mutateResource<CalendarCategory>(
        `/api/categories/${category.id}`,
        "PATCH",
        updates,
        "Failed to update category"
      );

      if (!json.data) {
        throw new Error("Failed to update category");
      }

      const savedCategory = json.data;
      setCategories((prev) =>
        prev.map((c) => (c.id === savedCategory.id ? savedCategory : c))
      );
    } catch (err) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? previousCategory : c))
      );
      setCategoriesError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    }
  };

  // Keep the Space visible until the server has preserved and returned its
  // events' colors. Removing it optimistically would flash their old colors.
  const deletingCategoryIds = useRef(new Set<string>());
  const handleDeleteCategory = async (category: CalendarCategory) => {
    if (!beginCategoryDeletion(deletingCategoryIds.current, category.id)) return;
    try {
      const result = await mutateResource<CalendarCategory, CategoryDeleteApiResponse>(
        `/api/categories/${category.id}`,
        "DELETE",
        undefined,
        "Failed to delete category"
      );
      if (!isCompletedCategoryDeletion(result)) {
        throw new Error("Failed to reconcile deleted Space");
      }
      events.reconcileSpaceRemoval(result.events, category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setHiddenCategoryIds((prev) => prev.filter((id) => id !== category.id));
    } catch (err) {
      setCategoriesError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    } finally {
      finishCategoryDeletion(deletingCategoryIds.current, category.id);
    }
  };

  // Not optimistic, unlike the handlers below: the create form (TaskList)
  // shows its own inline error on failure (same idea as the event editor's
  // `error` prop), so this just throws and lets the caller handle it,
  // rather than writing to the global tasksError banner.
  const handleCreateTask = async (title: string, dueAt?: string, categoryId?: string | null) => {
    const json = await mutateResource<CalendarTask>(
      "/api/tasks",
      "POST",
      { title, due_at: dueAt, category_id: categoryId },
      "Failed to create task"
    );

    if (!json.data) {
      throw new Error("Failed to create task");
    }

    setTasks((prev) => [...prev, json.data as CalendarTask]);
  };

  // Optimistic, same pattern as handleEventMove: flips the checkbox
  // immediately, rolls back just the `completed` field on failure.
  const handleToggleTaskComplete = async (task: CalendarTask) => {
    const previousCompleted = task.completed;
    const optimisticTask: CalendarTask = { ...task, completed: !task.completed };

    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimisticTask : t)));

    try {
      const json = await mutateResource<CalendarTask>(
        `/api/tasks/${task.id}`,
        "PATCH",
        { completed: optimisticTask.completed },
        "Failed to update task"
      );

      if (!json.data) {
        throw new Error("Failed to update task");
      }

      const savedTask = json.data;
      setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: previousCompleted } : t))
      );
      setTasksError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  // Optimistic, same pattern as handleDeleteEvent.
  const handleDeleteTask = async (task: CalendarTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await mutateResource<CalendarTask>(`/api/tasks/${task.id}`, "DELETE", undefined, "Failed to delete task");
    } catch (err) {
      setTasks((prev) => [...prev, task]);
      setTasksError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  // Selecting a day (from the mini calendar, or any of the main grids) also
  // moves the shared view to that day, so both stay in sync no matter which
  // one triggered the change. In month view that means jumping to that
  // day's month; in week/day view, viewDate becomes the day itself, since
  // WeekGrid/DayGrid derive the days they show from it directly, jumping to
  // that day's month would skip past the week or day actually clicked.
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewDate(view === "month" ? startOfMonth(date) : date);
  };

  // Ref on the calendar content area — used to get the container rect for
  // popover side computation.
  const calendarContentRef = useRef<HTMLDivElement>(null);

  // The event editor is anchored to whichever calendar element opened it.
  const [eventPopover, setEventPopover] = useState<{
    rect: DOMRect;
    side: "left" | "right";
    event: CalendarEvent | null;
    start: Date;
  } | null>(null);
  const [popoverSubmitting, setPopoverSubmitting] = useState(false);
  const [popoverError, setPopoverError] = useState<string | null>(null);
  const [popoverKey, setPopoverKey] = useState(0);

  const getPopoverSide = (anchorRect: DOMRect) => {
    const containerRect = calendarContentRef.current?.getBoundingClientRect();
    return containerRect ? computePopoverSide(anchorRect, containerRect) : "right";
  };

  const handleCreateEvent = (day: Date, anchorRect: DOMRect) => {
    setEventPopover({ rect: anchorRect, side: getPopoverSide(anchorRect), event: null, start: day });
    setPopoverError(null);
    setPopoverKey((key) => key + 1);
  };

  const handleEventClick = (event: CalendarEvent, anchorRect: DOMRect) => {
    setEventPopover({
      rect: anchorRect,
      side: getPopoverSide(anchorRect),
      event,
      start: new Date(event.start_at),
    });
    setPopoverError(null);
    setPopoverKey((key) => key + 1);
  };

  const handlePopoverSubmit = async (values: EventFormValues) => {
    if (!eventPopover) return;

    setPopoverSubmitting(true);
    setPopoverError(null);
    try {
      if (eventPopover.event) {
        await events.updateEvent(eventPopover.event.id, values);
      } else {
        await events.createEvent(values);
      }
      setEventPopover(null);
    } catch (err) {
      setPopoverError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPopoverSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventPopover?.event) return;
    const event = eventPopover.event;
    setEventPopover(null);
    await events.deleteEvent(event);
  };

  if (!mounted) return null;

  const visibleEvents = events.data.filter(
    (event) => !event.category_id || !hiddenCategoryIds.includes(event.category_id)
  );
  const visibleTasks = tasks.filter(
    (task) => !task.category_id || !hiddenCategoryIds.includes(task.category_id)
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-card text-foreground">
        {(events.error || tasksError || categoriesError) && (
          <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {events.error && <ErrorToast message={events.error} onDismiss={() => events.setError(null)} onRetry={handleRetry} />}
            {tasksError && <ErrorToast message={tasksError} onDismiss={() => setTasksError(null)} onRetry={handleRetry} />}
            {categoriesError && <ErrorToast message={categoriesError} onDismiss={() => setCategoriesError(null)} onRetry={handleRetry} />}
          </div>
        )}
        <CalendarSidebar
          currentDate={selectedDate}
          viewDate={viewDate}
          onDateSelect={handleDateSelect}
          tasks={tasks}
          tasksLoading={tasksLoading}
          onCreateTask={handleCreateTask}
          onToggleTaskComplete={handleToggleTaskComplete}
          onDeleteTask={handleDeleteTask}
          categories={categories}
          categoriesLoading={categoriesLoading}
          hiddenCategoryIds={hiddenCategoryIds}
          onToggleCategoryVisibility={handleToggleCategoryVisibility}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
        {events.initialLoading ? (
          <div className="flex-1">
            <LoadingSpinner />
          </div>
        ) : (
          <div ref={calendarContentRef} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
            {view === "month" && (
              <MonthGrid
                selectedDate={selectedDate}
                viewDate={viewDate}
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={handleToggleTaskComplete}
                view={view}
                onViewChange={setView}
              />
            )}
            {view === "week" && (
              <WeekGrid
                selectedDate={selectedDate}
                viewDate={viewDate}
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={handleToggleTaskComplete}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
                view={view}
                onViewChange={setView}
              />
            )}
            {view === "day" && (
              <DayGrid
                viewDate={viewDate}
                selectedDate={selectedDate}
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={handleToggleTaskComplete}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
                view={view}
                onViewChange={setView}
              />
            )}
          </div>
        )}
      {eventPopover && (
        <EventCreatePopover
          key={popoverKey}
          anchorRect={eventPopover.rect}
          side={eventPopover.side}
          event={eventPopover.event}
          initialStart={eventPopover.start}
          categories={categories}
          onSubmit={handlePopoverSubmit}
          onDelete={eventPopover.event ? handleDeleteEvent : undefined}
          onClose={() => setEventPopover(null)}
          submitting={popoverSubmitting}
          error={popoverError}
        />
      )}
    </div>
  );
}
