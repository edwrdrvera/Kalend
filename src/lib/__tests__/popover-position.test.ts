import { describe, expect, it } from "bun:test";
import { computePopoverSide } from "../popover-position";

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

  it("returns 'right' when right space equals left space (boundary)", () => {
    // anchorRect centered in the container → rightSpace = leftSpace = 400
    const anchor: Rect = { left: 400, right: 400 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("right");
  });

  it("returns 'left' when the anchor is flush with the container's right edge", () => {
    // anchorRect.right = 800 → rightSpace = 0, leftSpace = 700
    const anchor: Rect = { left: 700, right: 800 };
    const container: Rect = { left: 0, right: 800 };
    expect(computePopoverSide(anchor, container)).toBe("left");
  });

  it("picks the side with more room even when neither side fits the popover width", () => {
    // A narrow ~375px container split by an anchor near its left edge:
    // rightSpace = 315 (more room), leftSpace = 40 — neither reaches 320,
    // but "right" is still the better side for the tail arrow to point.
    const anchor: Rect = { left: 20, right: 60 };
    const container: Rect = { left: 0, right: 375 };
    expect(computePopoverSide(anchor, container)).toBe("right");
  });
});
