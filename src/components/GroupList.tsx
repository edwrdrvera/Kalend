"use client";

import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES } from "@/lib/event-colors";
import type { CalendarGroup } from "@/lib/calendar-types";
import type { PanelSubject } from "@/lib/panel-subject";

export interface GroupListProps {
  /** The selected Space, shown first as the way into its overview. */
  space: { id: string; name: string; color: PanelSubject["color"] };
  groups: CalendarGroup[];
  activeSubject: PanelSubject | null;
  onOpenSpace: (spaceId: string) => void;
  onOpenGroup: (group: CalendarGroup) => void;
  onCreateGroup: (spaceId: string) => void;
  onEditGroup: (group: CalendarGroup) => void;
}

const ROW_CLS =
  "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Shown at the top of the agenda column once a Space is selected: the Space
// itself (opens its overview), then its Groups. A Space with no Groups still
// shows how to make one.
export default function GroupList({
  space,
  groups,
  activeSubject,
  onOpenSpace,
  onOpenGroup,
  onCreateGroup,
  onEditGroup,
}: GroupListProps) {
  const spaceActive = activeSubject?.kind === "space" && activeSubject.spaceId === space.id;
  const swatch = (
    <span
      aria-hidden="true"
      className={cn("size-[10px] shrink-0 rounded-[3px]", EVENT_COLOR_SWATCH_CLASSES[space.color])}
    />
  );

  return (
    <div className="shrink-0 border-b border-border px-3 py-3">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <p className="text-[11px] font-medium text-muted-foreground">Groups</p>
        <button
          type="button"
          onClick={() => onCreateGroup(space.id)}
          aria-label="New Group"
          className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus aria-hidden className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onOpenSpace(space.id)}
          aria-current={spaceActive ? "true" : undefined}
          className={cn(
            ROW_CLS,
            "flex-none",
            spaceActive ? "bg-muted font-medium text-foreground" : "text-foreground hover:bg-muted/50"
          )}
        >
          {swatch}
          <span className="truncate">{space.name}</span>
        </button>
        {groups.map((group) => {
          const active = activeSubject?.kind === "group" && activeSubject.groupId === group.id;
          return (
            <div key={group.id} className="group/row flex items-center pl-4">
              <button
                type="button"
                onClick={() => onOpenGroup(group)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  ROW_CLS,
                  active ? "bg-muted font-medium text-foreground" : "text-foreground hover:bg-muted/50"
                )}
              >
                <span className="truncate">{group.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onEditGroup(group)}
                aria-label={`Edit Group ${group.name}`}
                className="ml-0.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/row:opacity-100"
              >
                <Pencil aria-hidden className="size-3" />
              </button>
            </div>
          );
        })}
        {groups.length === 0 && (
          <button
            type="button"
            onClick={() => onCreateGroup(space.id)}
            className="ml-4 mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus aria-hidden className="size-3.5" />
            Create a Group
          </button>
        )}
      </div>
    </div>
  );
}
