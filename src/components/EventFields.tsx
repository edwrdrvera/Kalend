"use client";

import { cn } from "@/lib/utils";
import { DateField, SMALL_INPUT_CLS } from "@/components/DateField";
import { DEFAULT_EVENT_COLOR, isEventColor, resolveDisplayColor } from "@/lib/event-colors";
import { eventColorReducer, type EventColorState } from "@/lib/event-color-state";
import { joinDateTimeLocal, splitDateTimeLocal } from "@/lib/event-draft";
import type { CalendarCategory } from "@/lib/calendar-types";
import ColorSwatchPicker from "./ColorSwatchPicker";
import CategorySelect from "./CategorySelect";

/** Start and end date/time pickers over local "yyyy-MM-ddTHH:mm" values. */
export function EventTimeFields({
  startAt,
  endAt,
  onStartChange,
  onEndChange,
}: {
  startAt: string;
  endAt: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  const start = splitDateTimeLocal(startAt);
  const end = splitDateTimeLocal(endAt);
  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Start</label>
        <div className="flex flex-col gap-1.5">
          <DateField
            label="Start date"
            value={start.date}
            onChange={(d) => onStartChange(joinDateTimeLocal(d, start.time))}
          />
          <input
            type="time"
            aria-label="Start time"
            value={start.time}
            onChange={(e) => onStartChange(joinDateTimeLocal(start.date, e.target.value))}
            className={cn(SMALL_INPUT_CLS, "w-full")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">End</label>
        <div className="flex flex-col gap-1.5">
          <DateField
            label="End date"
            value={end.date}
            onChange={(d) => onEndChange(joinDateTimeLocal(d, end.time))}
          />
          <input
            type="time"
            aria-label="End time"
            value={end.time}
            onChange={(e) => onEndChange(joinDateTimeLocal(end.date, e.target.value))}
            className={cn(SMALL_INPUT_CLS, "w-full")}
          />
        </div>
      </div>
    </div>
  );
}

/** Color swatch and Space picker. The color follows the Space until the user picks one. */
export function EventColorSpaceFields({
  colorState,
  categories,
  onChange,
}: {
  colorState: EventColorState;
  categories: CalendarCategory[];
  onChange: (next: EventColorState) => void;
}) {
  const { color, categoryId, colorOverridden } = colorState;
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const visibleColor = resolveDisplayColor(color, categoryId, colorOverridden, categories);
  const swatchColor = isEventColor(visibleColor) ? visibleColor : DEFAULT_EVENT_COLOR;

  return (
    <>
      <div className="flex items-center gap-2">
        <ColorSwatchPicker
          color={swatchColor}
          onColorChange={(nextColor) => onChange(eventColorReducer(colorState, { type: "pick", color: nextColor }))}
        />
        <CategorySelect
          categories={categories}
          categoryId={categoryId}
          onChange={(nextId) =>
            onChange(eventColorReducer(colorState, { type: "space", categoryId: nextId, categories }))
          }
        />
      </div>
      {selectedCategory && (
        colorOverridden ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(eventColorReducer(colorState, { type: "inherit" }))}
          >
            Use Space color
          </button>
        ) : <p className="text-xs text-muted-foreground">Using Space color</p>
      )}
    </>
  );
}
