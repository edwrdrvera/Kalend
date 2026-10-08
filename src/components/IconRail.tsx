"use client";

import type { ReactNode } from "react";
import { Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_COLOR,
  isEventColor,
  RAIL_SPACE_CLASSES,
  type EventColor,
} from "@/lib/event-colors";
import { spaceAbbreviation } from "@/lib/space-abbreviation";
import type { CalendarCategory } from "@/lib/calendar-types";
import KalendMark from "./KalendMark";
import { Tooltip, TooltipProvider } from "./ui/tooltip";

interface IconRailProps {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  onCreateSpace: () => void;
  /** Edit a Space (rename / recolor / delete). Wired to right-click on a tile. */
  onEditSpace: (category: CalendarCategory) => void;
  /** Account menu, composed by the state owner (keeps the rail presentational
   *  and free of router/auth dependencies). Rendered pinned at the bottom. */
  accountMenu?: ReactNode;
  /** Whether the side nav (agenda + mini calendar) is collapsed. Optional so
   *  direct renders without collapse wiring still typecheck. */
  collapsed?: boolean;
  /** Toggles the side nav's collapsed state. Optional; see `collapsed`. */
  onToggleCollapse?: () => void;
}

export default function IconRail({
  categories,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  onEditSpace,
  accountMenu,
  collapsed,
  onToggleCollapse,
}: IconRailProps) {
  const atAllSpaces = selectedSpaceId === null;

  return (
    <TooltipProvider>
      <nav
        aria-label="Main navigation"
        className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-card pb-3.5 pt-4"
      >
        {/* App mark now toggles the side nav's collapsed state, instead of
            selecting "All Spaces" (that moved to the stack icon below). */}
        <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
            className="grid size-[30px] place-items-center rounded-[9px] bg-primary transition-shadow hover:bg-primary/90"
          >
            <KalendMark size={18} tone="white" />
          </button>
        </Tooltip>

        {/* Divider */}
        <div className="my-[11px] h-px w-6 bg-border" />

        {/* View all spaces (this used to be the app mark's job). */}
        <Tooltip label="View all spaces">
          <button
            type="button"
            aria-label="View all spaces"
            aria-current={atAllSpaces ? "true" : undefined}
            onClick={() => onSelectSpace(null)}
            className={cn(
              "mb-[9px] grid size-[30px] place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              atAllSpaces && "ring-2 ring-primary/35 ring-offset-2 ring-offset-card"
            )}
          >
            <Layers className="size-4" />
          </button>
        </Tooltip>

        {/* Space marks */}
        <div className="flex flex-col items-center gap-[5px]">
          {categories.map((cat) => {
            const isActive = selectedSpaceId === cat.id;
            const color: EventColor = isEventColor(cat.color) ? cat.color : DEFAULT_EVENT_COLOR;
            return (
              <Tooltip key={cat.id} label={cat.name}>
                <button
                  type="button"
                  aria-label={cat.name}
                  onClick={() => onSelectSpace(isActive ? null : cat.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onEditSpace(cat);
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative grid size-[34px] place-items-center rounded-[10px] border-[1.5px] text-sm font-semibold transition-[filter] hover:brightness-110",
                    RAIL_SPACE_CLASSES[color],
                    // Open-Space marker on the rail's left edge.
                    "before:absolute before:top-1/2 before:-left-[15px] before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-foreground before:opacity-0 before:transition-[opacity,transform] before:duration-150 before:ease-snappy",
                    isActive ? "before:scale-y-100 before:opacity-100" : "before:scale-y-50"
                  )}
                >
                  {spaceAbbreviation(cat.name)}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Add Space */}
        <Tooltip label="Create space">
          <button
            type="button"
            aria-label="Create space"
            onClick={onCreateSpace}
            className="mt-[5px] grid size-[34px] place-items-center rounded-[10px] border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </Tooltip>

        {/* Spacer pushes the account menu to the bottom */}
        <div className="flex-1" />

        {/* Account menu (theme, sign out), composed by the state owner. */}
        {accountMenu}
      </nav>
    </TooltipProvider>
  );
}
