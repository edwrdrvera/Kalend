"use client";

import { useState } from "react";
import { Check, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, isEventColor } from "@/lib/event-colors";
import type { CalendarCategory } from "./Calendar";

interface CategorySelectProps {
  categories: CalendarCategory[];
  categoryId: string | null;
  onChange: (categoryId: string | null) => void;
  className?: string;
}

/** Popover-based dropdown for linking an event or task to one of the
 *  user's categories, or leaving it unlinked ("No category"). Shared by
 *  EventModal's event form and TaskList's task create form. */
export default function CategorySelect({
  categories,
  categoryId,
  onChange,
  className,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
          className
        )}
      >
        {selected ? (
          <>
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isEventColor(selected.color)
                  ? EVENT_COLOR_SWATCH_CLASSES[selected.color]
                  : "bg-muted-foreground"
              )}
            />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <Tag className="size-3.5 shrink-0" />
            <span>No category</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <span>No category</span>
            {categoryId === null && <Check className="size-3.5" />}
          </button>
          {categories.length > 0 && <div className="my-1 border-t border-border" />}
          {categories.length === 0 ? null : (
            categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  onChange(category.id);
                  setOpen(false);
                }}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      isEventColor(category.color)
                        ? EVENT_COLOR_SWATCH_CLASSES[category.color]
                        : "bg-muted-foreground"
                    )}
                  />
                  <span className="truncate">{category.name}</span>
                </span>
                {categoryId === category.id && <Check className="size-3.5 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
