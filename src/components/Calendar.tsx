"use client";

import { useState, useEffect, useRef } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventModal, { type EventFormValues } from "./EventModal";
import EventCreatePopover from "./EventCreatePopover";
import { computePopoverSide } from "@/lib/popover-position";
import type { CalendarView } from "./ViewSwitcher";
import type {
  CalendarEvent,
  CalendarTask,
  CalendarCategory,
  TasksApiResponse,
  CategoriesApiResponse,
} from "@/lib/calendar-types";
import { mutateResource } from "@/lib/api";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

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

  // Optimistic, same pattern as handleDeleteTask. The database detaches any
  // linked events/tasks itself (category_id is ON DELETE SET NULL), so
  // there's nothing extra to reconcile in events/tasks state here.
  const handleDeleteCategory = async (category: CalendarCategory) => {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));

    try {
      await mutateResource<CalendarCategory>(
        `/api/categories/${category.id}`,
        "DELETE",
        undefined,
        "Failed to delete category"
      );
    } catch (err) {
      setCategories((prev) => [...prev, category]);
      setCategoriesError(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    }
  };

  // Not optimistic, unlike the handlers below: the create form (TaskList)
  // shows its own inline error on failure (same idea as EventModal's
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

  // Create popover (anchored to the clicked day cell)
  const [createPopoverAnchor, setCreatePopoverAnchor] = useState<{
    rect: DOMRect;
    side: "left" | "right";
    start: Date;
  } | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateEvent = (day: Date, anchorRect: DOMRect) => {
    const containerRect = calendarContentRef.current?.getBoundingClientRect();
    const side = containerRect
      ? computePopoverSide(anchorRect, containerRect)
      : "right";
    setCreatePopoverAnchor({ rect: anchorRect, side, start: day });
    setCreateError(null);
  };

  const handleCreateSubmit = async (values: EventFormValues) => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await events.createEvent(values);
      setCreatePopoverAnchor(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Edit modal (dialog — stays for editing/deleting existing events)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  // Bumped every time the modal is opened so `key={modalKey}` below forces
  // EventModal to remount with fresh initial state, instead of an effect
  // resetting its fields after the fact.
  const [modalKey, setModalKey] = useState(0);

  const handleEventClick = (event: CalendarEvent) => {
    setModalEvent(event);
    setModalError(null);
    setModalOpen(true);
    setModalKey((key) => key + 1);
  };

  const handleModalSubmit = async (values: EventFormValues) => {
    setModalSubmitting(true);
    setModalError(null);
    try {
      if (modalEvent) await events.updateEvent(modalEvent.id, values);
      setModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Optimistic delete is handled by the hook; this thin wrapper reads from
  // modal state and closes the modal.
  const handleDeleteEvent = async () => {
    if (!modalEvent) return;
    setModalOpen(false);
    await events.deleteEvent(modalEvent);
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
      {createPopoverAnchor && (
        <EventCreatePopover
          anchorRect={createPopoverAnchor.rect}
          side={createPopoverAnchor.side}
          initialStart={createPopoverAnchor.start}
          categories={categories}
          onSubmit={handleCreateSubmit}
          onClose={() => setCreatePopoverAnchor(null)}
          submitting={createSubmitting}
          error={createError}
        />
      )}
      <EventModal
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode="edit"
        event={modalEvent}
        categories={categories}
        onSubmit={handleModalSubmit}
        onDelete={handleDeleteEvent}
        submitting={modalSubmitting}
        error={modalError}
      />
    </div>
  );
}
