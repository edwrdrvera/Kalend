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
  "h-8 rounded-sm border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-60";

export const SMALL_INPUT_CLS = APP_INPUT_CLS;

/** Custom date picker — opens MiniCalendar in a Popover instead of the
 *  browser's native date widget, which is unthemeable and looks generic. */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Parse at local noon so there's no UTC-midnight timezone shift.
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const displayValue = value ? format(date, "MMMM d, yyyy") : "not selected";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}, ${displayValue}`}
        className={cn(APP_INPUT_CLS, "w-full cursor-pointer text-left text-xs hover:bg-muted/30")}
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
