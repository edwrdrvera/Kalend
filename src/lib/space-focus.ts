export interface SpaceFocus {
  selectedSpaceId: string | null;
}

export const initialSpaceFocus: SpaceFocus = {
  selectedSpaceId: null,
};

type SpaceFocusAction =
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

export function filterBySpace<T extends { category_id: string | null }>(items: T[], focus: SpaceFocus): T[] {
  if (focus.selectedSpaceId === null) return items;
  return items.filter((item) => item.category_id === focus.selectedSpaceId);
}
