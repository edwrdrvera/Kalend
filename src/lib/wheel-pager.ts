/** Wheel and trackpad scrolling to page-by-page steps. A gesture fires once, then the pager locks.
 *  The lock lifts when the wheel goes quiet, or, after `cooldownMs`, when a scroll is no weaker than the
 *  one before it (a mouse notch) or reverses direction. Trackpad inertia only ever decays, so it stays locked. */
export interface WheelPager {
  /** Returns -1 (up), 1 (down), or 0 when this wheel event should not turn the page. */
  push(deltaY: number, now: number): -1 | 0 | 1;
}

export function createWheelPager({ threshold = 30, quietMs = 160, cooldownMs = 120 } = {}): WheelPager {
  let lastEventAt = -Infinity;
  let lockedAt = -Infinity;
  let locked = false;
  let accumulated = 0;
  let previousDelta = 0;

  return {
    push(deltaY, now) {
      const wentQuiet = now - lastEventAt > quietMs;
      const isFresh = Math.abs(deltaY) >= Math.abs(previousDelta) || Math.sign(deltaY) !== Math.sign(previousDelta);
      lastEventAt = now;
      previousDelta = deltaY;

      if (wentQuiet) accumulated = 0;
      if (locked && (wentQuiet || (now - lockedAt >= cooldownMs && isFresh))) locked = false;
      if (locked) return 0;

      accumulated += deltaY;
      if (Math.abs(accumulated) < threshold) return 0;

      locked = true;
      lockedAt = now;
      accumulated = 0;
      return deltaY > 0 ? 1 : -1;
    },
  };
}
