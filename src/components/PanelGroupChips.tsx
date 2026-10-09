"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROUP_CHIP_PRESSED_CLASSES } from "@/lib/event-colors";
import type { CalendarGroup } from "@/lib/calendar-types";
import type { PanelSubject } from "@/lib/panel-subject";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface PanelGroupNav {
  groups: CalendarGroup[];
  onOpenSpace: (spaceId: string) => void;
  onOpenGroup: (group: CalendarGroup) => void;
  onCreateGroup: (spaceId: string) => void;
}

const ALL = "all";

/** The Space's Groups as a chip row: All (the Space itself), each Group, and a new-Group button. */
export default function PanelGroupChips({
  subject,
  nav,
}: {
  subject: PanelSubject;
  nav: PanelGroupNav;
}) {
  const activeGroupId = subject.kind === "group" ? subject.groupId : null;
  const chipCls = cn(
    "h-[26px] min-w-0 max-w-full rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground",
    GROUP_CHIP_PRESSED_CLASSES[subject.color]
  );

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <ToggleGroup
        aria-label="Groups"
        value={[activeGroupId ?? ALL]}
        onValueChange={([next]) => {
          if (next === undefined) return;
          if (next === ALL) {
            nav.onOpenSpace(subject.spaceId);
            return;
          }
          const group = nav.groups.find((g) => g.id === next);
          if (group) nav.onOpenGroup(group);
        }}
        className="flex-wrap gap-1.5"
      >
        <ToggleGroupItem value={ALL} className={chipCls}>
          All
        </ToggleGroupItem>
        {nav.groups.map((group) => (
          <ToggleGroupItem key={group.id} value={group.id} className={chipCls}>
            <span className="truncate">{group.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="New Group"
        onClick={() => nav.onCreateGroup(subject.spaceId)}
        className="h-[26px] w-8 rounded-full text-muted-foreground"
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
