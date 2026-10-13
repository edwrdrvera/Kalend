"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MiniCalendar from "@/components/MiniCalendar";
import { cn } from "@/lib/utils";

/** Shared control treatment for authenticated-app forms. Components may
 *  adjust width or font weight, but borders, radius, fill, and focus stay
 *  consistent across Space, Task, and Event editors. */
export const APP_INPUT_CLS =
  "h-7 rounded-lg border border-input bg-transparent px-2 text-body text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-ring disabled:opacity-60 dark:bg-input/30";

export const SMALL_INPUT_CLS = APP_INPUT_CLS;

/** Compact field size: matches the 28px / 13px controls around it. */
export const FIELD_SIZE_CLS = "h-7 text-body md:text-body";

/** Thin focus ring for fields that sit inline in a panel or list. Dialogs keep the library ring. */
export const FIELD_INLINE_RING_CLS = "focus-ring";

/** Custom date picker — opens MiniCalendar in a Popover instead of the
 *  browser's native date widget, which is unthemeable and looks generic. */
export function DateField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Parse at local noon so there's no UTC-midnight timezone shift.
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const displayValue = value ? format(date, "MMMM d, yyyy") : "not selected";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}, ${displayValue}`}
        className={cn(APP_INPUT_CLS, "w-full cursor-pointer text-left text-xs hover:bg-hover", className)}
      >
        {value ? format(date, "MMM d, yyyy") : "Select date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <MiniCalendar
          currentDate={date}
          viewDate={date}
          onDateSelect={(d) => {
            onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
