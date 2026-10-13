import { describe, expect, it } from "bun:test";
import { createWheelPager } from "../wheel-pager";

describe("createWheelPager", () => {
  it("pages down on a scroll past the threshold", () => {
    expect(createWheelPager().push(100, 0)).toBe(1);
  });

  it("pages up on a negative scroll", () => {
    expect(createWheelPager().push(-100, 0)).toBe(-1);
  });

  it("accumulates small deltas before paging", () => {
    const pager = createWheelPager({ threshold: 30 });
    expect(pager.push(10, 0)).toBe(0);
    expect(pager.push(10, 10)).toBe(0);
    expect(pager.push(15, 20)).toBe(1);
  });

  it("pages again after the wheel has been quiet", () => {
    const pager = createWheelPager({ quietMs: 160 });
    expect(pager.push(100, 0)).toBe(1);
    expect(pager.push(100, 500)).toBe(1);
  });

  it("drops a half-finished gesture once the wheel goes quiet", () => {
    const pager = createWheelPager({ threshold: 30, quietMs: 160 });
    expect(pager.push(20, 0)).toBe(0);
    expect(pager.push(20, 500)).toBe(0);
  });

  it("pages on each notch of a mouse wheel, not once per spin", () => {
    const pager = createWheelPager();
    const steps = [0, 60, 120, 180, 240, 300].map((t) => pager.push(100, t));
    expect(steps.filter((s) => s === 1).length).toBeGreaterThanOrEqual(2);
  });

  it("stays locked through decaying trackpad inertia, however long it lasts", () => {
    const pager = createWheelPager();
    expect(pager.push(120, 0)).toBe(1);
    let delta = 110;
    for (let t = 16; t < 1500; t += 16) {
      expect(pager.push(delta, t)).toBe(0);
      delta = Math.max(1, delta * 0.97);
    }
  });

  it("pages back right after the cooldown when the direction reverses", () => {
    const pager = createWheelPager({ cooldownMs: 200 });
    expect(pager.push(100, 0)).toBe(1);
    expect(pager.push(-100, 50)).toBe(0);
    expect(pager.push(-100, 250)).toBe(-1);
  });
});
