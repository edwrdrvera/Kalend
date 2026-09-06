import { describe, expect, it } from "bun:test";
import { computePopoverSide, POPOVER_WIDTH } from "../popover-position";

/** Minimal rect shape the function actually reads. */
type Rect = { left: number; right: number };

describe("computePopoverSide", () => {
  // Container 800px wide (left: 0, right: 800) — typical calendar grid.

  it("returns 'right' when there is more space to the right than the popover width", () => {
    // anchorRect.right = 120 → rightSpace = 680 ≥ 320
    const anchor: Rect = { left: 0, right: 120 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("right");
  });

  it("returns 'left' when there is not enough space to the right", () => {
    // anchorRect.right = 620 → rightSpace = 180 < 320
    const anchor: Rect = { left: 500, right: 620 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("left");
  });

  it("returns 'right' when right space is exactly equal to the popover width (boundary)", () => {
    // anchorRect.right = 480 → rightSpace = 320 = 320 (≥)
    const anchor: Rect = { left: 380, right: 480 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("right");
  });

  it("returns 'left' when the anchor is flush with the container's right edge", () => {
    // anchorRect.right = 800 → rightSpace = 0 < 320
    const anchor: Rect = { left: 700, right: 800 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("left");
  });
});
