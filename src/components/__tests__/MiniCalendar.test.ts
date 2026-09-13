import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: MiniCalendar } = await import("../MiniCalendar");

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let lastSelectedDate: Date | null = null;

function renderMiniCalendar(
  currentDate = new Date(2030, 8, 9),
  viewDate = new Date(2030, 8, 9),
) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  lastSelectedDate = null;

  return act(() =>
    root?.render(createElement(MiniCalendar, {
      currentDate,
      viewDate,
      onDateSelect: (date: Date) => { lastSelectedDate = date; },
    }))
  );
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  lastSelectedDate = null;
  document.body.replaceChildren();
});

describe("MiniCalendar header", () => {
  it("shows month and year in the header", async () => {
    await renderMiniCalendar();

    const heading = document.querySelector("h2");
    expect(heading).not.toBeNull();
    expect(heading!.textContent).toBe("September 2030");
  });

  it("has no collapse toggle button", async () => {
    await renderMiniCalendar();

    expect(document.querySelector('[aria-label="Collapse mini calendar"]')).toBeNull();
    expect(document.querySelector('[aria-label="Expand mini calendar"]')).toBeNull();
  });
});

describe("MiniCalendar date selection", () => {
  it("calls onDateSelect when a date is clicked", async () => {
    await renderMiniCalendar();

    // Find a button with text "15" (September 15)
    const buttons = document.querySelectorAll<HTMLButtonElement>("button");
    const day15 = Array.from(buttons).find((b) => b.textContent === "15");
    expect(day15).not.toBeNull();

    await act(() => day15!.click());
    expect(lastSelectedDate).not.toBeNull();
    expect(lastSelectedDate!.getDate()).toBe(15);
    expect(lastSelectedDate!.getMonth()).toBe(8); // September
  });

  it("applies square rounding to the selected date cell", async () => {
    await renderMiniCalendar();

    // The selected date is September 9. Find that button.
    const buttons = document.querySelectorAll<HTMLButtonElement>("button");
    const day9 = Array.from(buttons).find(
      (b) => b.textContent === "9" && b.className.includes("bg-primary")
    );
    expect(day9).not.toBeNull();
    expect(day9!.className).toContain("rounded-[6px]");
    expect(day9!.className).not.toContain("rounded-full");
  });
});

describe("MiniCalendar month navigation", () => {
  it("navigates to the previous month", async () => {
    await renderMiniCalendar();

    const prevButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Previous month"]'
    );
    expect(prevButton).not.toBeNull();

    await act(() => prevButton!.click());

    const heading = document.querySelector("h2");
    expect(heading!.textContent).toBe("August 2030");
  });

  it("navigates to the next month", async () => {
    await renderMiniCalendar();

    const nextButton = document.querySelector<HTMLButtonElement>(
      '[aria-label="Next month"]'
    );
    expect(nextButton).not.toBeNull();

    await act(() => nextButton!.click());

    const heading = document.querySelector("h2");
    expect(heading!.textContent).toBe("October 2030");
  });
});

describe("MiniCalendar out-of-month dates", () => {
  it("applies heavily-muted styling to out-of-month dates", async () => {
    await renderMiniCalendar();

    // September 2030 starts on a Sunday, so the grid's first row starts
    // with Sept 1. The last row will have out-of-month October dates.
    const buttons = document.querySelectorAll<HTMLButtonElement>("button");
    // Find a "1" button that has the muted class (October 1, not September 1)
    const outOfMonthCells = Array.from(buttons).filter((b) =>
      b.className.includes("text-muted-foreground/30")
    );
    expect(outOfMonthCells.length).toBeGreaterThan(0);
  });
});
