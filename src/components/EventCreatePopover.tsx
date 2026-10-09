"use client";

import { useState, useEffect, useLayoutEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { initialEventColor } from "@/lib/event-color-state";
import { MAX_LOCATION_LENGTH, type EventFormValues } from "@/lib/event-form";
import {
  eventDraftValues,
  formatTimeRangeSummary,
  toDateTimeLocal,
  type EventDraft,
} from "@/lib/event-draft";
import { EventColorSpaceFields, EventTimeFields } from "./EventFields";
import { POPOVER_WIDTH, clampPopoverTop } from "@/lib/popover-position";
import type { CalendarCategory, CalendarGroup } from "@/lib/calendar-types";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
/** Gap between the anchor cell edge and the popover panel. */
const SIDE_GAP = 10;
const CHIP_CLS =
  "flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors hover:bg-hover";
const DASHED_CHIP_CLS = "border-dashed border-muted-foreground/40 text-muted-foreground";
/** First-render guess for vertical centering, replaced by the measured height. */
const POPOVER_HEIGHT_ESTIMATE = 200;

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
  /** Snapshotted Group, set when the event is created from a Group's panel. */
  initialGroupId?: string | null;
  categories: CalendarCategory[];
  groups: CalendarGroup[];
  /** `openDetails` saves the event, then opens it in the right panel. */
  onSubmit: (values: EventFormValues, openDetails?: boolean) => void;
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
  initialGroupId = null,
  categories,
  groups,
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
      description: "",
      startAt: toDateTimeLocal(start),
      endAt: toDateTimeLocal(initialEnd ?? new Date(start.getTime() + DEFAULT_DURATION_MS)),
      colorState: initialEventColor(null, initialSpaceId, initialGroupId),
      alertOffset: null,
    };
  });
  const update = (changes: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const [timeExpanded, setTimeExpanded] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // The panel grows when the time section expands, so the clamp uses the
  // measured height. The estimate covers the first render, before measuring.
  const panelRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const measure = () => setMeasuredHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const panelHeight = measuredHeight ?? POPOVER_HEIGHT_ESTIMATE;

  // Fixed position: vertically centered on the anchor, horizontally offset
  // to the chosen side.
  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const top = clampPopoverTop(anchorCenterY, panelHeight, window.innerHeight);
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
  const tailTop = Math.max(
    12,
    Math.min(anchorCenterY - top - tailHeight / 2, panelHeight - 12 - tailHeight)
  );

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitDraft = (openDetails: boolean) => {
    const { values, error: invalid } = eventDraftValues(draft);
    setValidationError(invalid);
    if (values) onSubmit(values, openDetails);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitDraft(false);
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
        ref={panelRef}
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
        className="animate-in fade-in-0 zoom-in-95 duration-100 motion-reduce:animate-none"
      >
      <div className="relative rounded-xl border border-border bg-popover text-popover-foreground">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-1.5">
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
              className="h-8 w-full bg-transparent text-[15px] font-semibold placeholder:text-muted-foreground focus-ring"
            />
          </div>

          {/* Time and location sit as chips under the title. Each opens its
              editor in place, so an untouched draft stays two lines tall. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-expanded={timeExpanded}
              onClick={() => setTimeExpanded((open) => !open)}
              className={cn(CHIP_CLS, "border-border bg-muted text-foreground")}
            >
              <Clock className="size-3 shrink-0 text-muted-foreground" />
              {formatTimeRangeSummary(draft.startAt, draft.endAt)}
            </button>
            {locationOpen || draft.location ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                <label htmlFor="new-event-location" className="sr-only">
                  Location
                </label>
                <input
                  id="new-event-location"
                  value={draft.location}
                  onChange={(e) => update({ location: e.target.value })}
                  maxLength={MAX_LOCATION_LENGTH}
                  placeholder="Location"
                  autoFocus={locationOpen && !draft.location}
                  className="h-7 w-36 rounded-full border border-input bg-transparent px-1.5 text-xs dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-ring"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLocationOpen(true)}
                className={cn(CHIP_CLS, DASHED_CHIP_CLS)}
              >
                <MapPin className="size-3 shrink-0" />
                Location
              </button>
            )}
            <EventColorSpaceFields
              colorState={draft.colorState}
              categories={categories}
              groups={groups}
              onChange={(colorState) => update({ colorState })}
              swatchClassName="size-4 rounded-full ring-offset-0"
              spaceClassName={cn(CHIP_CLS, DASHED_CHIP_CLS)}
            />
          </div>

          {/* Date/time pickers, revealed by the time chip */}
          <div
            inert={!timeExpanded}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-150 ease-out",
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

          {(validationError ?? error) && (
            <p className="text-xs text-destructive">{validationError ?? error}</p>
          )}

          <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-auto rounded-sm px-2 text-muted-foreground"
              disabled={submitting}
              onClick={() => submitDraft(true)}
            >
              More options
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-3"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} size="sm" className="rounded-full px-4">
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </>,
    document.body
  );
}
