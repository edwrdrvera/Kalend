import "./test-dom";
import { afterEach, describe, expect, it } from "bun:test";
import { createElement } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { ICS_TOO_LARGE_MESSAGE, MAX_ICS_BYTES } from "@/lib/ics-limits";

const { createRoot } = await import("react-dom/client");
const { default: ImportCalendarDialog } = await import("../ImportCalendarDialog");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(props: Partial<{ busy: boolean; error: string | null; result: string | null }> = {}) {
  const calls: File[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() =>
    root?.render(
      createElement(ImportCalendarDialog, {
        open: true,
        onOpenChange: () => {},
        busy: props.busy ?? false,
        error: props.error ?? null,
        result: props.result ?? null,
        onFile: (file: File) => {
          calls.push(file);
        },
      })
    )
  );
  return calls;
}

const fileInput = () => document.querySelector<HTMLInputElement>("[aria-label='Calendar file']")!;
const buttonWithText = (text: string) =>
  [...document.querySelectorAll("button")].find((button) => button.textContent?.includes(text));
const dialogText = () => document.querySelector("[role='dialog']")?.textContent ?? "";

function chooseFile(contents: string, name = "calendar.ics") {
  const file = new File([contents], name, { type: "text/calendar" });
  const transfer = new DataTransfer();
  transfer.items.add(file);
  const input = fileInput();
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return file;
}

describe("ImportCalendarDialog", () => {
  it("takes an .ics file and imports it", async () => {
    const calls = await render();
    expect(fileInput().accept).toBe(".ics,text/calendar");
    await act(() => {
      chooseFile("BEGIN:VCALENDAR");
    });
    await act(() => buttonWithText("Import")?.click());
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("calendar.ics");
  });

  it("shows the result line from a finished import", async () => {
    await render({ result: "Imported 42 events, left 3 unchanged, skipped 1" });
    expect(dialogText()).toContain("Imported 42 events, left 3 unchanged, skipped 1");
  });

  it("shows a plain error and stays on the file", async () => {
    await render({ error: "This file is not a calendar" });
    expect(dialogText()).toContain("This file is not a calendar");
  });

  it("refuses a file over the size limit before import", async () => {
    const calls = await render();
    await act(() => {
      chooseFile("x".repeat(MAX_ICS_BYTES + 1));
    });
    expect(dialogText()).toContain(ICS_TOO_LARGE_MESSAGE);
    expect(buttonWithText("Import")?.hasAttribute("disabled")).toBe(true);
    await act(() => buttonWithText("Import")?.click());
    expect(calls).toEqual([]);
  });

  it("shows a busy state while the import is in flight", async () => {
    await render({ busy: true });
    expect(buttonWithText("Importing...")?.hasAttribute("disabled")).toBe(true);
    expect(fileInput().disabled).toBe(true);
  });
});
