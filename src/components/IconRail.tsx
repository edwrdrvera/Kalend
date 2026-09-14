"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  RAIL_SPACE_ACTIVE_CLASSES,
  type EventColor,
} from "@/lib/event-colors";
import { spaceAbbreviation } from "@/lib/space-abbreviation";
import type { CalendarCategory } from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";
import KalendMark from "./KalendMark";

interface IconRailProps {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  onCreateSpace: () => void;
  /** Edit a Space (rename / recolor / delete). Wired to right-click on a tile. */
  onEditSpace: (category: CalendarCategory) => void;
  /** All branches across Spaces; the tile flyout lists a Space's own. */
  branches: Branch[];
  onOpenBranch: (branch: Branch) => void;
  /** Account menu, composed by the state owner (keeps the rail presentational
   *  and free of router/auth dependencies). Rendered pinned at the bottom. */
  accountMenu?: ReactNode;
}

export default function IconRail({
  categories,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  onEditSpace,
  branches,
  onOpenBranch,
  accountMenu,
}: IconRailProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex w-16 shrink-0 flex-col items-center bg-[var(--rail-bg)] pb-3.5 pt-4"
    >
      {/* App mark */}
      <div className="grid size-[30px] place-items-center rounded-[9px] bg-white/90">
        <KalendMark size={18} tone="ink" />
      </div>

      {/* Divider */}
      <div className="my-[11px] h-px w-6 bg-white/[0.15]" />

      {/* Space marks */}
      <div className="flex flex-col items-center gap-[5px]">
        {categories.map((cat) => {
          const isActive = selectedSpaceId === cat.id;
          const color: EventColor = isEventColor(cat.color) ? cat.color : DEFAULT_EVENT_COLOR;
          const spaceBranches = branches.filter((b) => b.spaceId === cat.id);
          return (
            <div key={cat.id} className="group relative">
              <button
                type="button"
                title={cat.name}
                aria-label={cat.name}
                onClick={() => onSelectSpace(isActive ? null : cat.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onEditSpace(cat);
                }}
                className={cn(
                  "grid size-[34px] place-items-center rounded-[10px] text-[13px] font-semibold transition-colors",
                  isActive
                    ? cn("border-[1.5px]", RAIL_SPACE_ACTIVE_CLASSES[color])
                    : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12]"
                )}
              >
                {spaceAbbreviation(cat.name)}
              </button>

              {/* Branch flyout: appears on hover or keyboard focus. */}
              {spaceBranches.length > 0 && (
                <div className="absolute left-full top-0 z-50 ml-2 hidden min-w-[180px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md group-hover:block group-focus-within:block">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat.name}
                  </p>
                  {spaceBranches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => onOpenBranch(branch)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-[10px] shrink-0 rounded-[3px]",
                          EVENT_COLOR_SWATCH_CLASSES[branch.color]
                        )}
                      />
                      <span className="truncate">{branch.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      {/* Spacer pushes the account menu to the bottom */}
      <div className="flex-1" />

      {/* Account menu (theme, sign out), composed by the state owner. */}
      {accountMenu}
    </nav>
  );
}
