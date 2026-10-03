"use client";

import { Calendar, ListTodo, Loader2 } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarAlert, CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";
import { dueSectionLabel, tasksDueOn } from "@/lib/day-agenda";
import AgendaDateHeader from "./AgendaDateHeader";
import AgendaScheduleGroup from "./AgendaScheduleGroup";
import BranchList from "./BranchList";
import TaskRow from "./TaskRow";

interface AgendaColumnProps {
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  loading: boolean;
  /** Events and tasks with an alert show a bell. */
  alertsByItem: ReadonlyMap<string, CalendarAlert>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  branches: Branch[];
  activeBranchId: string | null;
  onOpenBranch: (branch: Branch) => void;
  onOpenAllTasks: () => void;
}

export default function AgendaColumn({
  selectedDate,
  events,
  tasks,
  categories,
  loading,
  alertsByItem,
  onToggleTaskComplete,
  onOpenTask,
  onEventClick,
  branches,
  activeBranchId,
  onOpenBranch,
  onOpenAllTasks,
}: AgendaColumnProps) {
  const dayStart = startOfDay(selectedDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEvents = events.filter((ev) => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    return start <= dayEnd && end >= dayStart;
  });
  const dayTasks = tasksDueOn(tasks, selectedDate);

  const eventCount = dayEvents.length;
  const isEmpty = eventCount === 0 && dayTasks.length === 0;

  return (
    <div data-testid="agenda-column" className="flex h-full w-full flex-col bg-card">
      <BranchList branches={branches} activeBranchId={activeBranchId} onOpenBranch={onOpenBranch} />

      <AgendaDateHeader
        selectedDate={selectedDate}
        eventCount={eventCount}
        taskCount={dayTasks.filter((t) => !t.completed).length}
        action={
          <button
            type="button"
            onClick={onOpenAllTasks}
            className="flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ListTodo aria-hidden className="size-3.5" />
            All tasks
          </button>
        }
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
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-3">
            <AgendaScheduleGroup
              events={dayEvents}
              categories={categories}
              selectedDate={selectedDate}
              alertsByItem={alertsByItem}
              onEventClick={onEventClick}
            />
            {dayTasks.length > 0 && (
              <DueTasksSection
                label={dueSectionLabel(selectedDate, new Date())}
                tasks={dayTasks}
                categories={categories}
                alertsByItem={alertsByItem}
                onToggleTaskComplete={onToggleTaskComplete}
                onOpenTask={onOpenTask}
                precededBySchedule={eventCount > 0}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DueTasksSection({
  label,
  tasks,
  categories,
  alertsByItem,
  onToggleTaskComplete,
  onOpenTask,
  precededBySchedule,
}: {
  label: string;
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  alertsByItem: ReadonlyMap<string, CalendarAlert>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  precededBySchedule: boolean;
}) {
  return (
    <section aria-label={label} className={cn(precededBySchedule && "border-t border-border pt-3")}>
      <h3 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </h3>
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            categories={categories}
            hasAlert={alertsByItem.has(task.id)}
            onToggleTaskComplete={onToggleTaskComplete}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </section>
  );
}
