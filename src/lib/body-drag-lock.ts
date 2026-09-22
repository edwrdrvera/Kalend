/** Body text-select/cursor locking for the duration of a drag gesture.
 *  Kept at module scope on purpose: the React Compiler (via
 *  eslint-plugin-react-hooks) rejects `document.body.style.* = ...` writes
 *  that sit inside the component body, even within an effect. A plain
 *  module-level function is opaque to that analysis, so the imperative DOM
 *  work lives here instead. Returns the previous values to restore on
 *  cleanup. */
export interface BodyDragStyle {
  userSelect: string;
  cursor: string;
}

export function lockBodyForDrag(cursor: string): BodyDragStyle {
  const previous: BodyDragStyle = {
    userSelect: document.body.style.userSelect,
    cursor: document.body.style.cursor,
  };
  document.body.style.userSelect = "none";
  document.body.style.cursor = cursor;
  return previous;
}

export function restoreBodyAfterDrag(previous: BodyDragStyle): void {
  document.body.style.userSelect = previous.userSelect;
  document.body.style.cursor = previous.cursor;
}
