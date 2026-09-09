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
import type { CalendarEvent } from "@/lib/calendar-types";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";

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
  const tasks = useTasks();
  const categories = useCategories((detachedEvents, categoryId) => {
    events.reconcileSpaceRemoval(detachedEvents, categoryId);
    setHiddenCategoryIds((current) => current.filter((id) => id !== categoryId));
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRetry = () => {
    events.retry();
    tasks.retry();
    categories.retry();
  };

  const handleToggleCategoryVisibility = (categoryId: string) => {
    setHiddenCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
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
  const visibleTasks = tasks.data.filter(
    (task) => !task.category_id || !hiddenCategoryIds.includes(task.category_id)
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-card text-foreground">
        {(events.error || tasks.error || categories.error) && (
          <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {events.error && <ErrorToast message={events.error} onDismiss={() => events.setError(null)} onRetry={handleRetry} />}
            {tasks.error && <ErrorToast message={tasks.error} onDismiss={() => tasks.setError(null)} onRetry={handleRetry} />}
            {categories.error && <ErrorToast message={categories.error} onDismiss={() => categories.setError(null)} onRetry={handleRetry} />}
          </div>
        )}
        <CalendarSidebar
          currentDate={selectedDate}
          viewDate={viewDate}
          onDateSelect={handleDateSelect}
          tasks={tasks.data}
          tasksLoading={tasks.loading}
          onCreateTask={tasks.createTask}
          onToggleTaskComplete={tasks.toggleComplete}
          onDeleteTask={tasks.deleteTask}
          categories={categories.data}
          categoriesLoading={categories.loading}
          hiddenCategoryIds={hiddenCategoryIds}
          onToggleCategoryVisibility={handleToggleCategoryVisibility}
          onCreateCategory={categories.createCategory}
          onUpdateCategory={categories.updateCategory}
          onDeleteCategory={categories.deleteCategory}
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
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
          categories={categories.data}
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
