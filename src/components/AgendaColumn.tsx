"use client";

import { Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type {
  CalendarAlert,
  CalendarCategory,
  CalendarEvent,
  CalendarGroup,
  CalendarTask,
} from "@/lib/calendar-types";
import { dueSectionLabel, tasksDueOn } from "@/lib/day-agenda";
import { eventOnDay } from "@/lib/time-grid-layout";
import AgendaDateHeader from "./AgendaDateHeader";
import AgendaScheduleGroup from "./AgendaScheduleGroup";
import TaskRow from "./TaskRow";

interface AgendaColumnProps {
  selectedDate: Date;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  /** The selected Space, for the header caption. Null means all spaces. */
  selectedSpaceId: string | null;
  loading: boolean;
  /** Events and tasks with an alert show a bell. */
  alertsByItem: ReadonlyMap<string, CalendarAlert>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}

export default function AgendaColumn({
  selectedDate,
  events,
  tasks,
  categories,
  groups,
  selectedSpaceId,
  loading,
  alertsByItem,
  onToggleTaskComplete,
  onOpenTask,
  onEventClick,
}: AgendaColumnProps) {
  const dayEvents = events.filter((ev) => eventOnDay(ev, selectedDate));
  const dayTasks = tasksDueOn(tasks, selectedDate);

  const eventCount = dayEvents.length;
  const pathOf = (item: { category_id: string | null; group_id: string | null }) => {
    const space = categories.find((c) => c.id === item.category_id)?.name;
    const group = groups.find((g) => g.id === item.group_id)?.name;
    return [space, group].filter(Boolean).join(" · ");
  };
  const scopeLabel = categories.find((c) => c.id === selectedSpaceId)?.name ?? "all spaces";
  const isEmpty = eventCount === 0 && dayTasks.length === 0;

  return (
    <div data-testid="agenda-column" className="flex h-full w-full flex-col bg-card">
      <AgendaDateHeader
        selectedDate={selectedDate}
        eventCount={eventCount}
        taskCount={dayTasks.filter((t) => !t.completed).length}
        scopeLabel={scopeLabel}
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
          <p className="text-body text-muted-foreground">
            Nothing scheduled for {format(selectedDate, "MMMM d")}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div className="flex flex-col">
            <AgendaScheduleGroup
              events={dayEvents}
              categories={categories}
              pathOf={pathOf}
              selectedDate={selectedDate}
              alertsByItem={alertsByItem}
              onEventClick={onEventClick}
            />
            {dayTasks.length > 0 && (
              <DueTasksSection
                label={dueSectionLabel(selectedDate, new Date())}
                tasks={dayTasks}
                categories={categories}
                pathOf={pathOf}
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
  pathOf,
  alertsByItem,
  onToggleTaskComplete,
  onOpenTask,
  precededBySchedule,
}: {
  label: string;
  tasks: CalendarTask[];
  categories: CalendarCategory[];
  pathOf: (item: { category_id: string | null; group_id: string | null }) => string;
  alertsByItem: ReadonlyMap<string, CalendarAlert>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onOpenTask: (task: CalendarTask) => void;
  precededBySchedule: boolean;
}) {
  return (
    <section aria-label={label} className={cn(precededBySchedule && "mt-3 border-t border-border pt-2.5")}>
      <h3 className="label-caps pb-1">{label}</h3>
      <div className="flex flex-col">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            categories={categories}
            hasAlert={alertsByItem.has(task.id)}
            meta={pathOf(task)}
            onToggleTaskComplete={onToggleTaskComplete}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </section>
  );
}
