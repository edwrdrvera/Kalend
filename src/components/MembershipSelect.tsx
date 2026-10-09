"use client";

import { Fragment } from "react";
import { Tag } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { groupsOfSpace } from "@/lib/group-state";
import type { Membership } from "@/lib/membership";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";
import SpaceDot from "./SpaceDot";

interface MembershipSelectProps {
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  membership: Membership;
  onChange: (membership: Membership) => void;
  className?: string;
}

const NONE = "none";
const spaceValue = (spaceId: string) => `space:${spaceId}`;
const groupValue = (groupId: string) => `group:${groupId}`;

/** Dropdown that places an event or task: no Space, directly in a Space, or
 *  in one of a Space's Groups. Picking a Group also picks its Space, so a
 *  conflicting pair can't be chosen. Shared by every editor and composer. */
export default function MembershipSelect({
  categories,
  groups,
  membership,
  onChange,
  className,
}: MembershipSelectProps) {
  const space = categories.find((c) => c.id === membership.category_id) ?? null;
  const group = groups.find((g) => g.id === membership.group_id) ?? null;
  const current = group ? groupValue(group.id) : space ? spaceValue(space.id) : NONE;

  const choose = (value: string | null) => {
    if (value === null || value === NONE) return onChange({ category_id: null, group_id: null });
    if (value.startsWith("space:")) return onChange({ category_id: value.slice(6), group_id: null });
    const picked = groups.find((g) => g.id === value.slice(6));
    if (picked) onChange({ category_id: picked.category_id, group_id: picked.id });
  };

  return (
    <Select value={current} onValueChange={choose}>
      <SelectTrigger
        size="sm"
        aria-label={`Space: ${space ? (group ? `${space.name} / ${group.name}` : space.name) : "No Space"}`}
        className={cn(
          "min-w-0 border-transparent px-2 text-xs text-muted-foreground hover:bg-hover hover:text-foreground",
          className
        )}
      >
        <SelectValue>
          {space ? (
            <>
              <SpaceDot color={space.color} />
              <span className="truncate">{group ? `${space.name} / ${group.name}` : space.name}</span>
            </>
          ) : (
            <>
              <Tag className="size-3.5 shrink-0" />
              <span>No Space</span>
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" className="min-w-48">
        <SelectGroup>
          <SelectItem value={NONE}>No Space</SelectItem>
          {categories.length > 0 && <SelectSeparator />}
          {categories.map((category) => (
            <Fragment key={category.id}>
              <SelectItem value={spaceValue(category.id)}>
                <span className="flex min-w-0 items-center gap-2">
                  <SpaceDot color={category.color} />
                  <span className="truncate">{category.name}</span>
                </span>
              </SelectItem>
              {groupsOfSpace(groups, category.id).map((g) => (
                <SelectItem key={g.id} value={groupValue(g.id)} className="pl-6">
                  <span className="truncate">{g.name}</span>
                </SelectItem>
              ))}
            </Fragment>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
