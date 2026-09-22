import { expect, test } from "bun:test";
import * as TimeGrid from "../TimeGrid";

// Characterization guard for the drag-logic extraction. WeekGrid and DayGrid
// are TimeGrid's only consumers, and the value-level contract they depend on
// is these two constants: each is passed as the `hourHeight` prop and used as
// a `8 * <const>` scroll-to-8am offset. Pin the exact values so the extraction
// cannot silently change them.
test("TimeGrid preserves its named-export contract", () => {
  expect(TimeGrid.HOUR_HEIGHT_PX).toBe(64);
  expect(TimeGrid.DAY_VIEW_HOUR_HEIGHT_PX).toBe(44);
  expect(typeof TimeGrid.default).toBe("function");
});
