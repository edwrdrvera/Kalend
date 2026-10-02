import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { AlertTray } from "@/lib/alert-tray";
import "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: AlertMessages, ALERT_AUTO_DISMISS_MS } = await import("../AlertMessages");

const tray: AlertTray = {
  due: [{ id: "a1", kind: "event", itemId: "e1", text: "CS 101 Lecture starts in 15 min" }],
  missed: [
    { id: "a2", kind: "task", itemId: "t1", text: "Essay (reminder at Aug 9, 10:00 PM)" },
    { id: "a3", kind: "event", itemId: "e2", text: "Lab (reminder at Aug 9, 9:00 AM)" },
  ],
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;

// Captures the auto-dismiss timer so a test can fire or inspect it without
// waiting ten seconds. Every other timer (React's) passes straight through.
function captureDismissTimers() {
  const timers: { callback: () => void; handle: unknown; cleared: boolean }[] = [];
  globalThis.setTimeout = ((callback: () => void, ms?: number, ...rest: unknown[]) => {
    const handle = realSetTimeout(callback, ms, ...rest);
    if (ms === ALERT_AUTO_DISMISS_MS) timers.push({ callback, handle, cleared: false });
    return handle;
  }) as unknown as typeof setTimeout;
  globalThis.clearTimeout = ((handle: unknown) => {
    const timer = timers.find((t) => t.handle === handle);
    if (timer) timer.cleared = true;
    realClearTimeout(handle as never);
  }) as unknown as typeof clearTimeout;
  return timers;
}

async function render(value: AlertTray) {
  const calls = { opened: [] as string[], dismissed: [] as string[], cleared: 0 };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(AlertMessages, {
        tray: value,
        onOpen: (kind, id) => calls.opened.push(`${kind}:${id}`),
        onDismiss: (id) => calls.dismissed.push(id),
        onClearMissed: () => calls.cleared++,
      })
    )
  );
  return calls;
}

const button = (name: string) => {
  const found = [...container!.querySelectorAll("button")].find(
    (b) => b.textContent === name || b.getAttribute("aria-label") === name
  );
  if (!found) throw new Error(`No button named ${name}`);
  return found;
};

afterEach(async () => {
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("AlertMessages", () => {
  it("keeps an empty polite live region mounted so arrivals are announced", async () => {
    await render({ due: [], missed: [] });
    const region = container!.querySelector('[aria-live="polite"]');
    expect(region?.getAttribute("aria-label")).toBe("Reminders");
    expect(region?.textContent).toBe("");
  });

  it("shows due and missed reminders", async () => {
    await render(tray);
    const text = container!.textContent;
    expect(text).toContain("CS 101 Lecture starts in 15 min");
    expect(text).toContain("Missed while you were away");
    expect(text).toContain("Essay (reminder at Aug 9, 10:00 PM)");
  });

  it("opens the event or task and dismisses the reminder on click", async () => {
    const calls = await render(tray);
    await act(() => button("CS 101 Lecture starts in 15 min").click());
    await act(() => button("Lab (reminder at Aug 9, 9:00 AM)").click());
    expect(calls.opened).toEqual(["event:e1", "event:e2"]);
    expect(calls.dismissed).toEqual(["a1", "a3"]);
  });

  it("dismisses without opening from the dismiss button", async () => {
    const calls = await render(tray);
    await act(() => button("Dismiss: CS 101 Lecture starts in 15 min").click());
    expect(calls.dismissed).toEqual(["a1"]);
    expect(calls.opened).toEqual([]);
  });

  it("dismisses a due reminder with Escape", async () => {
    const calls = await render(tray);
    const row = button("CS 101 Lecture starts in 15 min").closest("li")!;
    const KeyEvent = (window as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
    await act(() => row.dispatchEvent(new KeyEvent("keydown", { key: "Escape", bubbles: true })));
    expect(calls.dismissed).toEqual(["a1"]);
  });

  it("clears the whole missed list with one button", async () => {
    const calls = await render(tray);
    await act(() => button("Dismiss all").click());
    expect(calls.cleared).toBe(1);
  });

  it("hides the missed section when nothing was missed", async () => {
    await render({ ...tray, missed: [] });
    expect(container!.textContent).not.toContain("Missed while you were away");
  });

  it("dismisses a due reminder by itself after a while, but never a missed one", async () => {
    const timers = captureDismissTimers();
    const calls = await render(tray);
    expect(timers).toHaveLength(1);
    await act(() => timers[0].callback());
    expect(calls.dismissed).toEqual(["a1"]);
  });

  it("holds the timer while the pointer is over the reminder", async () => {
    const timers = captureDismissTimers();
    await render(tray);
    const row = button("CS 101 Lecture starts in 15 min").closest("li")!;
    const MouseEvt = (window as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent;

    await act(() => row.dispatchEvent(new MouseEvt("mouseover", { bubbles: true })));
    expect(timers[0].cleared).toBe(true);

    await act(() => row.dispatchEvent(new MouseEvt("mouseout", { bubbles: true })));
    expect(timers).toHaveLength(2);
    expect(timers[1].cleared).toBe(false);
  });
});
