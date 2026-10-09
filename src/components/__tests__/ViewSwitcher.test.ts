import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: ViewSwitcher } = await import("../ViewSwitcher");
const { default: CalendarHeader } = await import("../CalendarHeader");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function render(element: (container: HTMLDivElement) => ReturnType<typeof createElement>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(element(container!)));
  return container;
}

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("ViewSwitcher", () => {
  it("names each segment by its full view, not its one-letter label", async () => {
    const el = await render(() =>
      createElement(ViewSwitcher, { view: "week", onViewChange: () => {} })
    );

    const names = Array.from(el.querySelectorAll('[role="tab"]')).map((tab) => tab.getAttribute("aria-label"));
    expect(names).toEqual(["Week", "Month", "Day"]);
  });
});

describe("CalendarHeader navigation names", () => {
  const cases = [
    ["week", "Previous week", "Next week"],
    ["month", "Previous month", "Next month"],
    ["day", "Previous day", "Next day"],
  ] as const;

  for (const [view, prev, next] of cases) {
    it(`names the prev and next buttons for ${view} view, with a tooltip`, async () => {
      const el = await render(() =>
        createElement(CalendarHeader, {
          title: "Title",
          onPrev: () => {},
          onNext: () => {},
          onToday: () => {},
          view,
          onViewChange: () => {},
        })
      );

      const prevButton = el.querySelector<HTMLButtonElement>(`button[aria-label="${prev}"]`);
      const nextButton = el.querySelector<HTMLButtonElement>(`button[aria-label="${next}"]`);
      expect(prevButton?.title).toBe(prev);
      expect(nextButton?.title).toBe(next);
    });
  }
});
