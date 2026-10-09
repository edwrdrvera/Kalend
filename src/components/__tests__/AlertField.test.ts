import { afterEach, describe, expect, it } from "bun:test";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import type { AlertOffset } from "@/lib/alerts";
import { chooseSelectOption } from "./test-dom";

const { createRoot } = await import("react-dom/client");
const { default: AlertField } = await import("../AlertField");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) await act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.body.replaceChildren();
});

async function render(value: AlertOffset | null, onChange: (offset: AlertOffset | null) => void) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(() => root?.render(createElement(AlertField, { id: "alert-test", value, onChange })));
  return document.querySelector<HTMLElement>("#alert-test")!;
}

describe("AlertField", () => {
  it("saves 60 minutes when 1 hour before is chosen", async () => {
    const saved: (AlertOffset | null)[] = [];
    const trigger = await render(null, (offset) => saved.push(offset));
    expect(trigger.getAttribute("role")).toBe("combobox");
    await chooseSelectOption(trigger, "1 hour before");
    expect(saved).toEqual([60]);
  });

  it("saves null when None is chosen", async () => {
    const saved: (AlertOffset | null)[] = [];
    const trigger = await render(15, (offset) => saved.push(offset));
    expect(trigger.querySelector("[data-slot=select-value]")?.textContent).toBe("15 min before");
    await chooseSelectOption(trigger, "None");
    expect(saved).toEqual([null]);
  });
});
