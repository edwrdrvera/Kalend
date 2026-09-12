/** Width of the event-create popover panel in px. Used by both the
 *  positioning logic and the panel's own Tailwind width class. */
export const POPOVER_WIDTH = 320;

/** Given the anchor element's rect (the clicked day cell) and the calendar
 *  grid container's rect, returns which side of the anchor to place the
 *  popover on: whichever side has more room. On narrow viewports neither
 *  side may fit the full popover width — the caller (EventCreatePopover)
 *  shrinks and clamps the panel to the viewport in that case, so this only
 *  needs to pick the better of the two sides for the tail arrow to point
 *  the right way when there IS enough room. */
export function computePopoverSide(
  anchorRect: { left: number; right: number },
  containerRect: { left: number; right: number }
): "left" | "right" {
  const rightSpace = containerRect.right - anchorRect.right;
  const leftSpace = anchorRect.left - containerRect.left;
  return rightSpace >= leftSpace ? "right" : "left";
}
