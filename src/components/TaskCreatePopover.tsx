"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CreateTaskForm, newTaskDraft, type TaskDraft } from "./AgendaSummary";
import { POPOVER_WIDTH } from "@/lib/popover-position";
import type { CalendarCategory } from "@/lib/calendar-types";

/** Gap between the anchor cell edge and the popover panel. Matches
 *  EventCreatePopover's SIDE_GAP so both popovers feel like one family. */
const SIDE_GAP = 10;
/** Used for vertical centering; approximate — this form is shorter than the
 *  event editor, so it gets its own estimate. */
const POPOVER_HEIGHT_ESTIMATE = 190;

interface TaskCreatePopoverProps {
  /** Bounding rect of the clicked day cell / "+ Task" trigger. */
  anchorRect: DOMRect;
  /** Which side of the anchor to open on, pre-computed by the caller. */
  side: "left" | "right";
  /** "yyyy-MM-dd" — pre-fills (and reveals) the due date field. */
  initialDueDate: string;
  /** Snapshotted Space focus at the moment the popover opened. */
  initialSpaceId: string | null;
  categories: CalendarCategory[];
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onClose: () => void;
}

/** Inline floating panel for creating a task pre-scoped to a calendar day,
 *  anchored to whichever cell or header the "+ Task" trigger lived in.
 *  Same positioning shape as EventCreatePopover, but wraps the sidebar's
 *  CreateTaskForm instead of duplicating a form. */
export default function TaskCreatePopover({
  anchorRect,
  side,
  initialDueDate,
  initialSpaceId,
  categories,
  onCreateTask,
  onClose,
}: TaskCreatePopoverProps) {
  const [draft, setDraft] = useState<TaskDraft>(() =>
    newTaskDraft(initialSpaceId, initialDueDate)
  );

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

  return createPortal(
    <>
      {/* Backdrop: closes the panel on click (not pointerdown) — see
          EventCreatePopover for why pointerdown would leak the click through
          to the calendar grid underneath. */}
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Create task"
        style={{
          position: "fixed",
          top,
          left: clampedLeft,
          width: effectiveWidth,
          zIndex: 50,
          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.12))",
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
          <CreateTaskForm
            draft={draft}
            onDraftChange={setDraft}
            onDiscard={onClose}
            onSubmitted={onClose}
            categories={categories}
            onCreateTask={onCreateTask}
          />
        </div>
      </div>
    </>,
    document.body
  );
}
