"use client";

import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, type EventColor } from "@/lib/event-colors";
import type { WeekLoadDay } from "@/lib/space-overview";
import { PRESS_CLS } from "./InspectorParts";

/** Hours in a day at or above which the bar turns to the warning color. */
const HEAVY_HOURS = 8;
const MAX_BAR_PX = 36;

interface PanelWeekLoadProps {
  days: WeekLoadDay[];
  color: EventColor;
  /** Name shown in the caption ("5h booked in School"). */
  scopeName: string;
  /** Selects the day in the calendar. */
  onSelectDay: (day: Date) => void;
  /** Gray bars, for views that span every Space. */
  neutral?: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function PanelWeekLoad({ days, color, scopeName, onSelectDay, neutral = false }: PanelWeekLoadProps) {
  if (days.length === 0) return null;
  const total = days.reduce((n, d) => n + d.hours, 0);

  const max = Math.max(1, ...days.map((d) => d.hours));
  const now = new Date();

  return (
    <section aria-label="This week" className="px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[12px] font-semibold text-muted-foreground">This week</h3>
        <span className="truncate pl-3 text-[11.5px] text-muted-foreground">
          {round1(total)}h booked in {scopeName}
        </span>
      </div>
      <ul className="mt-1.5 flex gap-1">
        {days.map(({ day, hours }) => {
          const today = isSameDay(day, now);
          return (
            <li key={day.toISOString()} className="flex flex-1">
            <button
              type="button"
              aria-label={`${format(day, "EEEE")}, ${round1(hours)} hours`}
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg pb-1.5 pt-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60",
                PRESS_CLS,
                today && "bg-primary/10 hover:bg-primary/15"
              )}
            >
              <span className="text-[11px] tabular-nums text-muted-foreground">{round1(hours)}h</span>
              <span className="flex h-9 items-end">
                <span
                  aria-hidden="true"
                  style={{ height: Math.max(3, Math.round((hours / max) * MAX_BAR_PX)) }}
                  className={cn(
                    "w-3.5 rounded-[3px]",
                    hours >= HEAVY_HOURS
                      ? "bg-warning"
                      : today
                        ? "bg-primary"
                        : neutral
                        ? "bg-muted-foreground/50"
                        : EVENT_COLOR_SWATCH_CLASSES[color],
                    !today && hours < HEAVY_HOURS && "opacity-60"
                  )}
                />
              </span>
              <span className={cn("text-[11px]", today ? "font-semibold text-primary-text" : "text-muted-foreground")}>
                {format(day, "EEEEE")}
              </span>
            </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
