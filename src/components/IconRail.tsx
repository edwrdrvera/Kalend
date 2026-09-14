"use client";

import { Calendar, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_COLOR,
  isEventColor,
  RAIL_SPACE_ACTIVE_CLASSES,
  type EventColor,
} from "@/lib/event-colors";
import { spaceAbbreviation } from "@/lib/space-abbreviation";
import type { CalendarCategory } from "@/lib/calendar-types";
import KalendMark from "./KalendMark";

interface IconRailProps {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  activeView: "calendar" | "tasks";
  onViewChange: (view: "calendar" | "tasks") => void;
  onCreateSpace: () => void;
}

export default function IconRail({
  categories,
  selectedSpaceId,
  onSelectSpace,
  activeView,
  onViewChange,
  onCreateSpace,
}: IconRailProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex w-16 shrink-0 flex-col items-center bg-[var(--rail-bg)] pb-3.5 pt-4"
    >
      {/* App mark */}
      <div className="mb-4 grid size-[30px] place-items-center rounded-[9px] bg-white/90">
        <KalendMark size={18} tone="ink" />
      </div>

      {/* View toggle */}
      <div className="flex flex-col items-center gap-[5px]">
        <button
          type="button"
          aria-label="Calendar view"
          title="Calendar"
          onClick={() => onViewChange("calendar")}
          className={cn(
            "grid size-[38px] place-items-center rounded-[11px] transition-colors",
            activeView === "calendar"
              ? "bg-white/[0.12] text-white"
              : "text-white/45 hover:text-white/70"
          )}
        >
          <Calendar className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Tasks view"
          title="Tasks"
          onClick={() => onViewChange("tasks")}
          className={cn(
            "grid size-[38px] place-items-center rounded-[11px] transition-colors",
            activeView === "tasks"
              ? "bg-white/[0.12] text-white"
              : "text-white/45 hover:text-white/70"
          )}
        >
          <ListTodo className="size-[18px]" />
        </button>
      </div>

      {/* Divider */}
      <div className="my-[11px] h-px w-6 bg-white/[0.15]" />

      {/* Space marks */}
      <div className="flex flex-col items-center gap-[5px]">
        {categories.map((cat) => {
          const isActive = selectedSpaceId === cat.id;
          const color: EventColor = isEventColor(cat.color) ? cat.color : DEFAULT_EVENT_COLOR;
          return (
            <button
              key={cat.id}
              type="button"
              title={cat.name}
              aria-label={cat.name}
              onClick={() => onSelectSpace(isActive ? null : cat.id)}
              className={cn(
                "grid size-[34px] place-items-center rounded-[10px] text-[13px] font-semibold transition-colors",
                isActive
                  ? cn("border-[1.5px]", RAIL_SPACE_ACTIVE_CLASSES[color])
                  : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12]"
              )}
            >
              {spaceAbbreviation(cat.name)}
            </button>
          );
        })}
      </div>

      {/* Add Space */}
      <button
        type="button"
        aria-label="Create space"
        title="Create space"
        onClick={onCreateSpace}
        className="mt-[5px] grid size-[34px] place-items-center rounded-[10px] border border-dashed border-white/20 text-white/40 transition-colors hover:border-white/40 hover:text-white/60"
      >
        +
      </button>

      {/* Spacer pushes avatar to bottom */}
      <div className="flex-1" />

      {/* Avatar placeholder */}
      <div
        className="grid size-[30px] place-items-center rounded-full bg-white/[0.12] text-[13px] font-semibold text-white/80"
        title="Account"
      >
        E
      </div>
    </nav>
  );
}
