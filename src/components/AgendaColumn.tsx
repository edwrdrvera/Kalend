"use client";

import { Calendar, Loader2 } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { isMultiDayEvent } from "@/lib/time-grid-layout";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";
import AgendaDateHeader from "./AgendaDateHeader";
import AgendaScheduleGroup from "./AgendaScheduleGroup";
import AgendaTasksGroup from "./AgendaTasksGroup";
import BranchList from "./BranchList";

interface AgendaColumnProps {
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  loading: boolean;
  selectedSpaceId: string | null;
  onCreateTask: (
    title: string,
    dueAt?: string,
    categoryId?: string | null
  ) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  branches: Branch[];
  activeBranchId: string | null;
  onOpenBranch: (branch: Branch) => void;
}

export default function AgendaColumn({
  selectedDate,
  events,
  tasks,
  categories,
  loading,
  selectedSpaceId,
  onCreateTask,
  onToggleTaskComplete,
  onDeleteTask,
  onEventClick,
  branches,
  activeBranchId,
  onOpenBranch,
}: AgendaColumnProps) {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  // Events that overlap the selected date.
  const dayEvents = events.filter((ev) => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    return start <= dayEnd && end >= dayStart;
  });

  // Tasks due on the selected date (or with no due date).
  const dayTasks = tasks.filter((t) => {
    if (!t.due_at) return true;
    return isSameDay(new Date(t.due_at), dayStart);
  });

  const eventCount = dayEvents.length;
  const taskCount = dayTasks.filter((t) => !t.completed).length;
  // Show the column body when there's anything to display, even completed tasks.
  const isEmpty = eventCount === 0 && dayTasks.length === 0;

  return (
    <div
      data-testid="agenda-column"
      className="flex h-full w-full flex-col bg-card"
    >
      <BranchList
        branches={branches}
        activeBranchId={activeBranchId}
        onOpenBranch={onOpenBranch}
      />

      <AgendaDateHeader
        selectedDate={selectedDate}
        eventCount={eventCount}
        taskCount={taskCount}
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2
            className="size-5 animate-spin text-muted-foreground"
            aria-label="Loading agenda"
          />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <Calendar className="size-6 text-muted-foreground/50" />
          <p className="text-[13px] text-muted-foreground">
            Nothing scheduled for {format(selectedDate, "MMMM d")}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-[14px]">
          <div className="flex flex-col gap-[14px]">
            <AgendaScheduleGroup
              events={dayEvents}
              categories={categories}
              selectedDate={selectedDate}
              onEventClick={onEventClick}
            />
            <AgendaTasksGroup
              tasks={tasks}
              categories={categories}
              selectedDate={selectedDate}
              selectedSpaceId={selectedSpaceId}
              onCreateTask={onCreateTask}
              onToggleTaskComplete={onToggleTaskComplete}
              onDeleteTask={onDeleteTask}
            />
          </div>
        </div>
      )}
    </div>
  );
}
