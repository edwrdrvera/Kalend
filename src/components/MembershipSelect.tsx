"use client";

import { useState } from "react";
import { Check, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, isEventColor } from "@/lib/event-colors";
import { groupsOfSpace } from "@/lib/group-state";
import type { Membership } from "@/lib/membership";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";

interface MembershipSelectProps {
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  membership: Membership;
  onChange: (membership: Membership) => void;
  className?: string;
}

const OPTION_CLS =
  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-hover";

/** Popover dropdown that places an event or task: no Space, directly in a
 *  Space, or in one of a Space's Groups. Picking a Group also picks its Space,
 *  so a conflicting pair can't be chosen. Shared by every editor and composer. */
export default function MembershipSelect({
  categories,
  groups,
  membership,
  onChange,
  className,
}: MembershipSelectProps) {
  const [open, setOpen] = useState(false);
  const space = categories.find((c) => c.id === membership.category_id) ?? null;
  const group = groups.find((g) => g.id === membership.group_id) ?? null;
  const choose = (next: Membership) => {
    onChange(next);
    setOpen(false);
  };
  const swatch = (category: CalendarCategory) =>
    cn(
      "size-2 shrink-0 rounded-[2px]",
      isEventColor(category.color) ? EVENT_COLOR_SWATCH_CLASSES[category.color] : "bg-muted-foreground"
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Space: ${space ? (group ? `${space.name} / ${group.name}` : space.name) : "No Space"}`}
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-hover hover:text-foreground",
          className
        )}
      >
        {space ? (
          <>
            <span className={swatch(space)} />
            <span className="truncate">{group ? `${space.name} / ${group.name}` : space.name}</span>
          </>
        ) : (
          <>
            <Tag className="size-3.5 shrink-0" />
            <span>No Space</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1">
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          <li>
            <button
              type="button"
              onClick={() => choose({ category_id: null, group_id: null })}
              className={cn(OPTION_CLS, membership.category_id === null && "bg-muted font-medium text-foreground")}
            >
              <span>No Space</span>
              {membership.category_id === null && <Check className="size-3" />}
            </button>
          </li>
          {categories.length > 0 && <li className="my-1 border-t border-border" />}
          {categories.map((category) => {
            const inSpace = membership.category_id === category.id;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => choose({ category_id: category.id, group_id: null })}
                  className={cn(OPTION_CLS, inSpace && !group && "bg-muted font-medium text-foreground")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={swatch(category)} />
                    <span className="truncate">{category.name}</span>
                  </span>
                  {inSpace && !group && <Check className="size-3 shrink-0" />}
                </button>
                {groupsOfSpace(groups, category.id).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => choose({ category_id: category.id, group_id: g.id })}
                    className={cn(OPTION_CLS, "pl-6", membership.group_id === g.id && "bg-muted font-medium text-foreground")}
                  >
                    <span className="truncate">{g.name}</span>
                    {membership.group_id === g.id && <Check className="size-3 shrink-0" />}
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
