/**
 * Minimal renderHook for bun:test + happy-dom.
 *
 * Creates a happy-dom Window and assigns DOM globals so React can render,
 * then mounts a tiny component that calls the hook and stashes its return
 * value. `act()` flushes React batches via microtask settling.
 */
import { Window } from "happy-dom";
import { createElement } from "react";
import { createRoot } from "react-dom/client";

// Register DOM globals once.
let registered = false;
function ensureDOM() {
  if (registered) return;

  const window = new Window({ url: "http://localhost" });

  // React DOM reads `window.event`, `document`, and many other browser
  // globals. Assign the full Window, then cherry-pick the few that React
  // references at the top level.
  (globalThis as Record<string, unknown>).window = window;

  const globals = [
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
    "CustomEvent",
  ] as const;

  for (const key of globals) {
    if (!(key in globalThis)) {
      (globalThis as Record<string, unknown>)[key] = (
        window as unknown as Record<string, unknown>
      )[key];
    }
  }

  registered = true;
}

/** Flush several microtask cycles so React processes state updates and effects. */
async function flush() {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}

interface RenderHookResult<T> {
  /** Current return value of the hook. */
  result: { current: T };
  /** Flush React updates (state changes, effects). */
  act: (fn: () => void | Promise<void>) => Promise<void>;
  /** Unmount the test component. */
  unmount: () => void;
}

/**
 * Render a React hook in isolation and return its current value.
 *
 * Usage:
 * ```ts
 * const { result, act } = renderHook(() => useMyHook());
 * await act(() => {}); // flush mount effects
 * expect(result.current.loading).toBe(false);
 * ```
 */
export function renderHook<T>(hookFn: () => T): RenderHookResult<T> {
  ensureDOM();

  const resultRef = { current: undefined as unknown as T };

  function TestComponent() {
    resultRef.current = hookFn();
    return null;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(createElement(TestComponent));

  async function act(fn: () => void | Promise<void>) {
    await fn();
    // Flush microtask cycles so React processes state updates, effects,
    // and any async work (like resolved fetch promises).
    await flush();
  }

  function unmount() {
    root.unmount();
    container.remove();
  }

  return { result: resultRef, act, unmount };
}
