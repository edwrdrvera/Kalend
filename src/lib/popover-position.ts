/** Width of the event-create popover panel in px. Used by both the
 *  positioning logic and the panel's own Tailwind width class. */
export const POPOVER_WIDTH = 320;

/** Given the anchor element's rect (the clicked day cell) and the calendar
 *  grid container's rect, returns which side of the anchor to place the
 *  popover on: "right" if there is room to the right, "left" otherwise. */
export function computePopoverSide(
  anchorRect: { left: number; right: number },
  containerRect: { left: number; right: number }
): "left" | "right" {
  const rightSpace = containerRect.right - anchorRect.right;
  return rightSpace >= POPOVER_WIDTH ? "right" : "left";
}
