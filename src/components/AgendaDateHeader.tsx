"use client";

import { format } from "date-fns";

interface AgendaDateHeaderProps {
  selectedDate: Date;
  eventCount: number;
  taskCount: number;
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export default function AgendaDateHeader({
  selectedDate,
  eventCount,
  taskCount,
}: AgendaDateHeaderProps) {
  const parts: string[] = [];
  if (eventCount > 0) parts.push(countLabel(eventCount, "event"));
  if (taskCount > 0) parts.push(countLabel(taskCount, "task"));

  return (
    <div className="shrink-0 border-b border-border px-4 pt-3 pb-2.5">
      <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
        {format(selectedDate, "EEEE, MMM d")}
      </h2>
      {parts.length > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {parts.join(" · ")}
        </p>
      )}
    </div>
  );
}
