"use client";

import { format, isToday } from "date-fns";

interface AgendaDateHeaderProps {
  selectedDate: Date;
  eventCount: number;
  taskCount: number;
  /** Where the counts come from: the selected Space's name, or "all spaces". */
  scopeLabel: string;
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export default function AgendaDateHeader({
  selectedDate,
  eventCount,
  taskCount,
  scopeLabel,
}: AgendaDateHeaderProps) {
  const day = format(selectedDate, "EEE MMM d");

  return (
    <div className="shrink-0 px-4 pt-4 pb-2.5">
      <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
        {isToday(selectedDate) ? `Today · ${day}` : day}
      </h2>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
        {countLabel(eventCount, "event")}, {taskCount} due · {scopeLabel}
      </p>
    </div>
  );
}
