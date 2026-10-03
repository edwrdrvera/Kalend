"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { APP_INPUT_CLS } from "@/components/DateField";
import { initialEventColor } from "@/lib/event-color-state";
import { MAX_ICON_LENGTH, MAX_LOCATION_LENGTH, type EventFormValues } from "@/lib/event-form";
import {
  eventDraftValues,
  formatTimeRangeSummary,
  toDateTimeLocal,
  type EventDraft,
} from "@/lib/event-draft";
import { EventColorSpaceFields, EventTimeFields } from "./EventFields";
import IconPicker from "./IconPicker";
import { POPOVER_WIDTH } from "@/lib/popover-position";
import type { CalendarCategory } from "@/lib/calendar-types";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
/** Gap between the anchor cell edge and the popover panel. */
const SIDE_GAP = 10;
/** Used for vertical centering; approximate — exact height varies with content. */
const POPOVER_HEIGHT_ESTIMATE = 300;

export type { EventFormValues } from "@/lib/event-form";

interface EventCreatePopoverProps {
  /** Bounding rect of the clicked day cell — used to anchor the panel. */
  anchorRect: DOMRect;
  /** Which side of the anchor to open on, pre-computed by the caller. */
  side: "left" | "right";
  /** Pre-populates start time when creating from a clicked day or time slot. */
  initialStart?: Date;
  /** Pre-populates end time when creating from a dragged time range. */
  initialEnd?: Date;
  /** Snapshotted Space focus used only when creating a new event. */
  initialSpaceId?: string | null;
  categories: CalendarCategory[];
  onSubmit: (values: EventFormValues) => void;
  onClose: () => void;
  submitting?: boolean;
  error?: string | null;
}

/** Inline floating panel for quick event creation, anchored to the day cell
 *  the user clicked. Opens to the right (or left when near the edge). No
 *  dialog backdrop — the calendar stays fully visible behind it. */
export default function EventCreatePopover({
  anchorRect,
  side,
  initialStart,
  initialEnd,
  initialSpaceId = null,
  categories,
  onSubmit,
  onClose,
  submitting = false,
  error = null,
}: EventCreatePopoverProps) {
  const [draft, setDraft] = useState<EventDraft>(() => {
    const start = initialStart ?? new Date();
    return {
      title: "",
      icon: "",
      location: "",
      startAt: toDateTimeLocal(start),
      endAt: toDateTimeLocal(initialEnd ?? new Date(start.getTime() + DEFAULT_DURATION_MS)),
      colorState: initialEventColor(null, initialSpaceId),
      alertOffset: null,
    };
  });
  const update = (changes: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fixed position: vertically centered on the anchor, horizontally offset
  // to the chosen side.
  const rawTop = anchorRect.top + anchorRect.height / 2 - POPOVER_HEIGHT_ESTIMATE / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - POPOVER_HEIGHT_ESTIMATE - 8));
  // On viewports narrower than the panel (plus its 8px margins), shrink the
  // panel to fit instead of letting it overflow the screen.
  const effectiveWidth = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
  const left =
    side === "right"
      ? anchorRect.right + SIDE_GAP
      : anchorRect.left - effectiveWidth - SIDE_GAP;
  const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - effectiveWidth - 8));
  // If the anchor sits close enough to the viewport edge that clamping had
  // to move the panel away from it, the tail arrow would no longer point at
  // the anchor cell — hide it rather than show a misleading pointer.
  const wasClamped = clampedLeft !== left;

  const tailWidth = 8;
  const tailHeight = 14;
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const tailTop = Math.max(
    12,
    Math.min(anchorCenterY - top - tailHeight / 2, POPOVER_HEIGHT_ESTIMATE - 12 - tailHeight)
  );

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { values, error: invalid } = eventDraftValues(draft);
    setValidationError(invalid);
    if (values) onSubmit(values);
  };

  return createPortal(
    <>
      {/* Backdrop: sits below the panel and nested pickers (both z-50) at
          z-49. Any click that reaches this div landed outside the panel and
          all open pickers, so it closes the editor. Clicks on the panel or
          on any nested picker popover are captured by those elements first
          and never reach the backdrop. */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        // Close on click (not pointerdown) so the backdrop stays mounted
        // through the full pointer cycle. If we close on pointerdown, React
        // removes the backdrop before pointerup/click fire, and those events
        // land on the now-exposed calendar grid — selecting a day and opening
        // a new creation popover.
        onClick={onClose}
      />
      {/* Fixed, compact editor that stays visually subordinate to the calendar. */}
      <div
        role="dialog"
        aria-label="Create event"
        style={{
          position: "fixed",
          top,
          left: clampedLeft,
          width: effectiveWidth,
          zIndex: 50,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))",
        }}
        className="animate-in fade-in-0 zoom-in-95 duration-100"
      >
      <div className="relative rounded-md border border-border bg-popover text-popover-foreground">
        {!wasClamped && (
          <svg
            aria-hidden="true"
            className="absolute overflow-visible"
            style={{
              top: tailTop,
              width: tailWidth,
              height: tailHeight,
              ...(side === "right" ? { left: -tailWidth } : { right: -tailWidth }),
            }}
            viewBox={`0 0 ${tailWidth} ${tailHeight}`}
          >
            <path
              d={
                side === "right"
                  ? `M ${tailWidth} 0 L 0 ${tailHeight / 2} L ${tailWidth} ${tailHeight}`
                  : `M 0 0 L ${tailWidth} ${tailHeight / 2} L 0 ${tailHeight}`
              }
              className="fill-popover stroke-border"
              strokeWidth="1"
            />
          </svg>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 p-3">
          {/* Title, with a small optional icon/symbol alongside it */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="new-event-icon" className="sr-only">
              Event icon
            </label>
            <IconPicker value={draft.icon} onChange={(icon) => update({ icon })} maxLength={MAX_ICON_LENGTH} />
            <label htmlFor="new-event-title" className="sr-only">
              Event title
            </label>
            <input
              id="new-event-title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="New event"
              required
              autoFocus
              className={cn(APP_INPUT_CLS, "w-full font-semibold")}
            />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <label htmlFor="new-event-location" className="sr-only">
              Location
            </label>
            <input
              id="new-event-location"
              value={draft.location}
              onChange={(e) => update({ location: e.target.value })}
              maxLength={MAX_LOCATION_LENGTH}
              className={cn(APP_INPUT_CLS, "w-full")}
            />
          </div>

          {/* Collapsed time summary → expands to date/time pickers */}
          <div className="flex flex-col">
            <div
              inert={timeExpanded}
              className={cn(
                "grid transition-all duration-150 ease-in-out",
                timeExpanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
              )}
            >
              <div className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTimeExpanded(true)}
                  className="-mx-1 flex items-center gap-2 rounded-sm px-1 py-1 text-left text-xs text-foreground/80 transition-colors hover:bg-muted/50"
                >
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{formatTimeRangeSummary(draft.startAt, draft.endAt)}</span>
                </button>
              </div>
            </div>
            <div
              inert={!timeExpanded}
              className={cn(
                "grid transition-all duration-150 ease-in-out",
                timeExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <EventTimeFields
                  startAt={draft.startAt}
                  endAt={draft.endAt}
                  onStartChange={(startAt) => update({ startAt })}
                  onEndChange={(endAt) => update({ endAt })}
                />
              </div>
            </div>
          </div>

          <EventColorSpaceFields
            colorState={draft.colorState}
            categories={categories}
            onChange={(colorState) => update({ colorState })}
          />

          {(validationError ?? error) && (
            <p className="text-xs text-destructive">{validationError ?? error}</p>
          )}

          <div className="flex items-center justify-end gap-1.5 border-t border-border pt-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-sm px-3"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm" className="rounded-sm px-3">
              {submitting ? "Creating…" : "Create event"}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </>,
    document.body
  );
}
