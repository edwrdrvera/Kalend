"use client";

import { cn } from "@/lib/utils";
import { DateField, SMALL_INPUT_CLS } from "@/components/DateField";
import { DEFAULT_EVENT_COLOR, isEventColor, resolveDisplayColor } from "@/lib/event-colors";
import { eventColorReducer, type EventColorState } from "@/lib/event-color-state";
import { joinDateTimeLocal, splitDateTimeLocal } from "@/lib/event-draft";
import { membershipOf } from "@/lib/membership";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";
import ColorSwatchPicker from "./ColorSwatchPicker";
import MembershipSelect from "./MembershipSelect";

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

interface ColorSpaceProps {
  colorState: EventColorState;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  onChange: (next: EventColorState) => void;
}

function useSwatchColor({ colorState, categories }: Pick<ColorSpaceProps, "colorState" | "categories">) {
  const { color, categoryId, colorOverridden } = colorState;
  const visibleColor = resolveDisplayColor(color, categoryId, colorOverridden, categories);
  return isEventColor(visibleColor) ? visibleColor : DEFAULT_EVENT_COLOR;
}

/** The Space picker. Picking a Group also picks its Space. */
export function EventSpaceSelect({
  colorState,
  categories,
  groups,
  onChange,
  className,
}: ColorSpaceProps & { className?: string }) {
  const { categoryId, groupId } = colorState;
  return (
    <MembershipSelect
      categories={categories}
      groups={groups}
      className={className}
      membership={membershipOf({ category_id: categoryId, group_id: groupId })}
      onChange={(next) =>
        onChange(
          next.group_id
            ? eventColorReducer(colorState, { type: "group", groupId: next.group_id, categoryId: next.category_id, categories })
            : eventColorReducer(colorState, { type: "space", categoryId: next.category_id, categories })
        )
      }
    />
  );
}

/** The color swatch and the note on whether the Space or the user chose it. */
export function EventColorControl({
  colorState,
  categories,
  onChange,
  swatchClassName,
  className,
}: Pick<ColorSpaceProps, "colorState" | "categories" | "onChange"> & {
  swatchClassName?: string;
  className?: string;
}) {
  const { categoryId, colorOverridden } = colorState;
  const hasSpace = categories.some((c) => c.id === categoryId);
  const swatchColor = useSwatchColor({ colorState, categories });
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasSpace &&
        (colorOverridden ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(eventColorReducer(colorState, { type: "inherit" }))}
          >
            Use Space color
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Using Space color</span>
        ))}
      <ColorSwatchPicker
        color={swatchColor}
        className={swatchClassName}
        onColorChange={(nextColor) => onChange(eventColorReducer(colorState, { type: "pick", color: nextColor }))}
      />
    </div>
  );
}

/** Color swatch and Space picker, stacked. The color follows the Space until the user picks one. */
export function EventColorSpaceFields({
  swatchClassName,
  spaceClassName,
  ...props
}: ColorSpaceProps & {
  /** Restyle the swatch and Space trigger, for editors that show them as chips. */
  swatchClassName?: string;
  spaceClassName?: string;
}) {
  const hasSpace = props.categories.some((c) => c.id === props.colorState.categoryId);
  const swatchColor = useSwatchColor(props);
  const { colorState, categories, onChange } = props;
  return (
    <>
      <div className="flex items-center gap-2">
        <ColorSwatchPicker
          color={swatchColor}
          className={swatchClassName}
          onColorChange={(nextColor) => onChange(eventColorReducer(colorState, { type: "pick", color: nextColor }))}
        />
        <EventSpaceSelect {...props} className={spaceClassName} />
      </div>
      {hasSpace &&
        (colorState.colorOverridden ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-primary hover:underline"
            onClick={() => onChange(eventColorReducer(colorState, { type: "inherit" }))}
          >
            Use Space color
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Using Space color</p>
        ))}
    </>
  );
}
