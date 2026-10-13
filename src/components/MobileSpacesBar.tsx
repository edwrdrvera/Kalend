"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EVENT_COLOR,
  GROUP_CHIP_PRESSED_CLASSES,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import { Toggle } from "@/components/ui/toggle";
import { CHIP_CLS } from "./control-styles";
import SpaceDot from "./SpaceDot";
import type { CalendarCategory } from "@/lib/calendar-types";

interface MobileSpacesBarProps {
  categories: CalendarCategory[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  onCreateSpace: () => void;
  /** Account menu element, composed by the state owner (Calendar). */
  accountMenu?: ReactNode;
}

/**
 * The Spaces control for the mobile slide-out, which has no icon rail. A
 * horizontal, scrollable row of Space chips (tap to filter, tap the active
 * one to clear) plus a create button and the account menu. Editing a Space on
 * mobile happens through its Space panel (overflow), the same as on desktop.
 */
export default function MobileSpacesBar({
  categories,
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  accountMenu,
}: MobileSpacesBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {categories.map((cat) => {
          const isActive = selectedSpaceId === cat.id;
          const color: EventColor = isEventColor(cat.color)
            ? cat.color
            : DEFAULT_EVENT_COLOR;
          return (
            <Toggle
              key={cat.id}
              aria-label={cat.name}
              pressed={isActive}
              onPressedChange={() => onSelectSpace(isActive ? null : cat.id)}
              className={cn(CHIP_CLS, "shrink-0", GROUP_CHIP_PRESSED_CLASSES[color])}
            >
              <SpaceDot color={color} />
              <span className="max-w-[9rem] truncate">{cat.name}</span>
            </Toggle>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Create space"
        onClick={onCreateSpace}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>

      {accountMenu}
    </div>
  );
}
