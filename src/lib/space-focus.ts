export interface SpaceFocus {
  selectedSpaceId: string | null;
}

export const initialSpaceFocus: SpaceFocus = {
  selectedSpaceId: null,
};

export type SpaceFocusAction =
  | { type: "select"; spaceId: string | null }
  | { type: "deleted"; spaceId: string };

export function spaceFocusReducer(state: SpaceFocus, action: SpaceFocusAction): SpaceFocus {
  if (action.type === "select") {
    return { selectedSpaceId: action.spaceId };
  }
  // "deleted": if the removed Space was the active filter, fall back to All Spaces.
  return {
    selectedSpaceId: state.selectedSpaceId === action.spaceId ? null : state.selectedSpaceId,
  };
}

/** True when the item should render at full strength: no Space is selected, or
 *  the item belongs to the selected one. Other items stay on the calendar, dimmed. */
export function isEmphasized(item: { category_id: string | null }, focus: SpaceFocus): boolean {
  return focus.selectedSpaceId === null || item.category_id === focus.selectedSpaceId;
}

/** Quiet de-emphasis that keeps color and layout. Full strength returns on hover and keyboard focus. */
export const DIMMED_ITEM_CLASS =
  "opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100";

export function dimClass(item: { category_id: string | null }, focus: SpaceFocus): string {
  return isEmphasized(item, focus) ? "" : DIMMED_ITEM_CLASS;
}
