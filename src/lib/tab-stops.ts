const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Controls inside `root` that Tab can reach, in document order. */
export function tabStops(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && !el.closest("[inert]")
  );
}

/**
 * Where Tab or Shift+Tab must move focus to keep it inside `root`, or null
 * when the browser's own move already stays inside. The container itself
 * counts as sitting before the first stop, since a dialog focuses it on open.
 */
export function wrapTabTarget(
  root: HTMLElement,
  active: Element | null,
  shiftKey: boolean
): HTMLElement | null {
  const stops = tabStops(root);
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return null;
  if (shiftKey && (active === first || active === root)) return last;
  if (!shiftKey && (active === last || active === root)) return first;
  return null;
}
