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
  "HTMLFormElement",
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

// React DOM and Base UI detect DOM support while their modules are evaluated.
// Import DOM-dependent modules dynamically after importing this helper.
