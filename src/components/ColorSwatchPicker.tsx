"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EVENT_COLORS, EVENT_COLOR_SWATCH_CLASSES, type EventColor } from "@/lib/event-colors";

interface ColorSwatchPickerProps {
  color: EventColor;
  onColorChange: (color: EventColor) => void;
  disabled?: boolean;
  className?: string;
}

/** A single circular swatch for the active color. Clicking it opens the
 *  full palette in a shadcn Popover; picking a color updates the indicator
 *  and closes the popover (tracked explicitly — Popover only auto-closes on
 *  outside click/Escape, not on an arbitrary click inside its content).
 *  `disabled` renders a plain, non-interactive dot instead (e.g. when a
 *  linked category governs the color and this swatch would otherwise be
 *  misleading to click). Shared by the event editor's color field and
 *  CategoryManager's category color picker. */
export default function ColorSwatchPicker({
  color,
  onColorChange,
  disabled = false,
  className,
}: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <span
        aria-hidden
        className={cn("size-7 shrink-0 rounded-sm", EVENT_COLOR_SWATCH_CLASSES[color], className)}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Change color, currently ${color}`}
        className={cn(
          "size-7 shrink-0 rounded-sm ring-1 ring-transparent ring-offset-1 ring-offset-popover transition-colors hover:ring-foreground/25",
          EVENT_COLOR_SWATCH_CLASSES[color],
          className
        )}
      />
      <PopoverContent className="w-auto p-2.5">
        <div className="flex flex-wrap gap-2">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onColorChange(c);
                setOpen(false);
              }}
              aria-label={c}
              aria-pressed={color === c}
              className={cn(
                "size-6 rounded-sm transition-colors",
                EVENT_COLOR_SWATCH_CLASSES[c],
                color === c
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                  : "hover:ring-1 hover:ring-foreground/25"
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
