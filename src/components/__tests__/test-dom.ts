import { act } from "react";
import { Window } from "happy-dom";

export const testWindow = new Window({ url: "http://localhost" });

const browserGlobals = [
  "document",
  "HTMLElement",
  "HTMLDivElement",
  "Node",
  "Text",
  "Element",
  "DocumentFragment",
  "navigator",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Event",
  "MouseEvent",
  "CustomEvent",
  "localStorage",
  "getComputedStyle",
  "ResizeObserver",
  "PointerEvent",
  "KeyboardEvent",
  "HTMLButtonElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLFormElement",
  "DOMRect",
] as const;

const globals = globalThis as Record<string, unknown>;
const windowGlobals = testWindow as unknown as Record<string, unknown>;

globals.window = testWindow;
globals.IS_REACT_ACT_ENVIRONMENT = true;
for (const key of browserGlobals) {
  globals[key] = windowGlobals[key];
}

/** Types into a React-controlled input through its native setter so React's
 *  value tracker observes the input event. */
export function typeInto(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(testWindow.HTMLInputElement.prototype, "value")?.set?.call(
    input,
    value
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Like `typeInto`, for a textarea. */
export function typeIntoTextarea(textarea: HTMLTextAreaElement, value: string) {
  Object.getOwnPropertyDescriptor(testWindow.HTMLTextAreaElement.prototype, "value")?.set?.call(
    textarea,
    value
  );
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

/** An option's text without the glyph happy-dom adds for its icons. */
function optionText(el: Element) {
  return el.textContent?.replace(/[▼▲]/g, "").trim();
}

/** Opens a ui/select trigger and clicks the option with this exact text. It
 *  runs its own `act` steps, so callers await it without wrapping it. */
export async function chooseSelectOption(trigger: HTMLElement, label: string) {
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (el) => optionText(el) === label
  );
  if (!option) {
    const seen = [...document.querySelectorAll('[role="option"]')].map((el) => el.textContent);
    throw new Error(`no option "${label}" (saw ${JSON.stringify(seen)})`);
  }
  await act(async () => {
    option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    option.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

/** The option texts of a ui/select, read by opening it. */
export async function selectOptionLabels(trigger: HTMLElement) {
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  return [...document.querySelectorAll('[role="option"]')].map(optionText);
}

const ALERT_LABELS: Record<string, string> = {
  "": "None",
  "0": "At the time",
  "5": "5 min before",
  "15": "15 min before",
  "60": "1 hour before",
  "1440": "1 day before",
};

/** The saved minutes ("" for none) an alert select currently shows. */
export function alertValue(trigger: HTMLElement) {
  const text = trigger.querySelector("[data-slot=select-value]")?.textContent?.trim();
  const match = Object.entries(ALERT_LABELS).find(([, label]) => label === text);
  if (!match) throw new Error(`alert select shows unknown text ${JSON.stringify(text)}`);
  return match[0];
}

/** Picks an alert by its saved minutes ("" for none) through the alert select. */
export function chooseAlert(trigger: HTMLElement, minutes: string) {
  return chooseSelectOption(trigger, ALERT_LABELS[minutes]!);
}

// React DOM and Base UI detect DOM support while their modules are evaluated.
// Import DOM-dependent modules dynamically after importing this helper.
