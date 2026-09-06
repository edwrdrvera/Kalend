"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MiniCalendar from "@/components/MiniCalendar";
import { cn } from "@/lib/utils";

/** Base Tailwind classes for the compact inline inputs used in event/task
 *  forms. Add a width utility (`w-full` or `flex-1`) when composing. */
export const SMALL_INPUT_CLS =
  "h-6 rounded border border-input bg-transparent px-1.5 text-xs text-foreground outline-none focus:border-primary";

/** Custom date picker — opens MiniCalendar in a Popover instead of the
 *  browser's native date widget, which is unthemeable and looks generic. */
export function DateField({
  value,
  onChange,
}: {
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Parse at local noon so there's no UTC-midnight timezone shift.
  const date = value ? new Date(`${value}T12:00:00`) : new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(SMALL_INPUT_CLS, "w-full cursor-pointer text-left hover:bg-muted/30")}
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
