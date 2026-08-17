"use client";

import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventModal, { type EventFormValues } from "./EventModal";
import type { CalendarView } from "./ViewSwitcher";

// Wire shape of an event as returned by GET /api/events: dates arrive as
// ISO strings over JSON, not the `Date` objects the Drizzle `Event` type
// declares server-side.
export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  color: string | null;
  category_id: string | null;
}

interface EventsApiResponse {
  success: boolean;
  data?: CalendarEvent[];
  error?: string;
}

// Wire shape of a task as returned by GET /api/tasks, same ISO-string
// caveat as CalendarEvent above.
export interface CalendarTask {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  color: string | null;
  category_id: string | null;
}

interface TasksApiResponse {
  success: boolean;
  data?: CalendarTask[];
  error?: string;
}

// Wire shape of a category as returned by GET /api/categories.
export interface CalendarCategory {
  id: string;
  name: string;
  color: string | null;
}

interface CategoriesApiResponse {
  success: boolean;
  data?: CalendarCategory[];
  error?: string;
}

// Generic fetch-then-check wrapper used by every create/edit/delete/move
// handler below. Doesn't enforce `data` being present since DELETE's
// response doesn't include it; callers that need `data` check after.
interface MutationResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function mutateResource<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: object | undefined,
  fallbackError: string
): Promise<MutationResponse<T>> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: MutationResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? fallbackError);
  }
  return json;
}

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
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<CalendarView>("month");
  const [mounted, setMounted] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Initialized to true because the fetch fires immediately on mount.
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  // True until the first events fetch resolves (success or failure), so the
  // loading spinner only shows on the very first load, not on subsequent
  // re-fetches when navigating months with an empty calendar.
  const [initialLoading, setInitialLoading] = useState(true);
  // Bumping this triggers a re-fetch of all three data sources, used by the
  // retry button in error toasts.
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-fetches on mount and whenever the visible month changes. GET
  // /api/events isn't date-filtered yet (see TASKS.md), so this currently
  // re-fetches the same full set on navigation — kept anyway so a
  // date-range query param can be added later without touching this hook.
  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setEventsLoading(true);
      setEventsError(null);

      try {
        const res = await fetch("/api/events");
        const json: EventsApiResponse = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Failed to load events");
        }

        if (!cancelled) {
          setEvents(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setEventsError(
            err instanceof Error ? err.message : "Failed to load events"
          );
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
          setInitialLoading(false);
        }
      }
    }

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [viewDate, retryCount]);

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
    setInitialLoading(true);
    setRetryCount((c) => c + 1);
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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalInitialStart, setModalInitialStart] = useState<Date | undefined>();
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  // Bumped every time the modal is opened so `key={modalKey}` below forces
  // EventModal to remount with fresh initial state, instead of an effect
  // resetting its fields after the fact.
  const [modalKey, setModalKey] = useState(0);

  const handleCreateEvent = (day: Date) => {
    setModalMode("create");
    setModalEvent(null);
    setModalInitialStart(day);
    setModalError(null);
    setModalOpen(true);
    setModalKey((key) => key + 1);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setModalMode("edit");
    setModalEvent(event);
    setModalError(null);
    setModalOpen(true);
    setModalKey((key) => key + 1);
  };

  const handleModalSubmit = async (values: EventFormValues) => {
    setModalSubmitting(true);
    setModalError(null);

    try {
      const isEdit = modalMode === "edit" && modalEvent;
      const fallbackError = `Failed to ${isEdit ? "update" : "create"} event`;
      const json = await mutateResource<CalendarEvent>(
        isEdit ? `/api/events/${modalEvent.id}` : "/api/events",
        isEdit ? "PATCH" : "POST",
        {
          title: values.title,
          start_at: values.startAt,
          end_at: values.endAt,
          color: values.color,
          category_id: values.categoryId,
        },
        fallbackError
      );

      if (!json.data) {
        throw new Error(fallbackError);
      }

      const savedEvent = json.data;
      setEvents((prev) =>
        isEdit
          ? prev.map((event) => (event.id === savedEvent.id ? savedEvent : event))
          : [...prev, savedEvent]
      );

      setModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Optimistic: remove from state and close the modal immediately, rather
  // than waiting on the DELETE response. On failure the event is put back
  // and eventsError surfaces why.
  const handleDeleteEvent = async () => {
    if (!modalEvent) return;

    const eventToDelete = modalEvent;
    setEvents((prev) => prev.filter((event) => event.id !== eventToDelete.id));
    setModalOpen(false);

    try {
      await mutateResource<CalendarEvent>(
        `/api/events/${eventToDelete.id}`,
        "DELETE",
        undefined,
        "Failed to delete event"
      );
    } catch (err) {
      setEvents((prev) => [...prev, eventToDelete]);
      setEventsError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    }
  };

  // Shared by drag-move and drag-resize: both apply the new start/end
  // optimistically (so the drag doesn't snap back while the request is in
  // flight), then reconcile with the server response. On failure, only
  // start_at/end_at are rolled back (not the whole event) so a concurrent
  // edit that succeeded in the meantime isn't discarded with the failed move.
  const handleEventTimeChange = async (event: CalendarEvent, start: Date, end: Date) => {
    const previousStartAt = event.start_at;
    const previousEndAt = event.end_at;
    const optimisticEvent: CalendarEvent = {
      ...event,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    };

    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? optimisticEvent : e))
    );

    try {
      const json = await mutateResource<CalendarEvent>(
        `/api/events/${event.id}`,
        "PATCH",
        { start_at: optimisticEvent.start_at, end_at: optimisticEvent.end_at },
        "Failed to update event"
      );

      if (!json.data) {
        throw new Error("Failed to update event");
      }

      const savedEvent = json.data;
      setEvents((prev) =>
        prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
      );
    } catch (err) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? { ...e, start_at: previousStartAt, end_at: previousEndAt }
            : e
        )
      );
      setEventsError(
        err instanceof Error ? err.message : "Failed to update event"
      );
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative flex h-full w-full overflow-hidden text-foreground">
      {(eventsError || tasksError || categoriesError) && (
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
          {eventsError && <ErrorToast message={eventsError} onDismiss={() => setEventsError(null)} onRetry={handleRetry} />}
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
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
      {initialLoading ? (
        <div className="flex-1">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthGrid
              selectedDate={selectedDate}
              viewDate={viewDate}
              events={events}
              tasks={tasks}
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
              events={events}
              tasks={tasks}
              categories={categories}
              onDateSelect={handleDateSelect}
              onViewDateChange={setViewDate}
              onCreateEvent={handleCreateEvent}
              onEventClick={handleEventClick}
              onTaskClick={handleToggleTaskComplete}
              onEventMove={handleEventTimeChange}
              onEventResize={handleEventTimeChange}
              view={view}
              onViewChange={setView}
            />
          )}
          {view === "day" && (
            <DayGrid
              viewDate={viewDate}
              events={events}
              tasks={tasks}
              categories={categories}
              onDateSelect={handleDateSelect}
              onViewDateChange={setViewDate}
              onCreateEvent={handleCreateEvent}
              onEventClick={handleEventClick}
              onTaskClick={handleToggleTaskComplete}
              onEventMove={handleEventTimeChange}
              onEventResize={handleEventTimeChange}
              view={view}
              onViewChange={setView}
            />
          )}
        </>
      )}
      <EventModal
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        event={modalEvent}
        initialStart={modalInitialStart}
        categories={categories}
        onSubmit={handleModalSubmit}
        onDelete={handleDeleteEvent}
        submitting={modalSubmitting}
        error={modalError}
      />
    </div>
  );
}
