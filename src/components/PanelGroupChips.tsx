"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_CLASSES } from "@/lib/event-colors";
import type { CalendarGroup } from "@/lib/calendar-types";
import type { PanelSubject } from "@/lib/panel-subject";

export interface PanelGroupNav {
  groups: CalendarGroup[];
  onOpenSpace: (spaceId: string) => void;
  onOpenGroup: (group: CalendarGroup) => void;
  onCreateGroup: (spaceId: string) => void;
}

const CHIP_CLS =
  "h-[26px] rounded-full border px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The Space's Groups as a chip row: All (the Space itself), each Group, and a new-Group button. */
export default function PanelGroupChips({
  subject,
  nav,
}: {
  subject: PanelSubject;
  nav: PanelGroupNav;
}) {
  const activeGroupId = subject.kind === "group" ? subject.groupId : null;
  const selected = EVENT_COLOR_CLASSES[subject.color];
  const idle = "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div role="group" aria-label="Groups" className="mt-2.5 flex flex-wrap gap-1.5">
      <button
        type="button"
        aria-pressed={activeGroupId === null}
        onClick={() => nav.onOpenSpace(subject.spaceId)}
        className={cn(CHIP_CLS, activeGroupId === null ? selected : idle)}
      >
        All
      </button>
      {nav.groups.map((group) => (
        <button
          key={group.id}
          type="button"
          aria-pressed={activeGroupId === group.id}
          onClick={() => nav.onOpenGroup(group)}
          className={cn(CHIP_CLS, "max-w-full truncate", activeGroupId === group.id ? selected : idle)}
        >
          {group.name}
        </button>
      ))}
      <button
        type="button"
        aria-label="New Group"
        onClick={() => nav.onCreateGroup(subject.spaceId)}
        className="grid h-[26px] w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
