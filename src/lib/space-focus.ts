export interface SpaceFocus {
  selectedSpaceId: string | null;
  hiddenSpaceIds: string[];
}

export const initialSpaceFocus: SpaceFocus = {
  selectedSpaceId: null,
  hiddenSpaceIds: [],
};

type SpaceFocusAction =
  | { type: "select"; spaceId: string | null }
  | { type: "toggleVisibility"; spaceId: string }
  | { type: "deleted"; spaceId: string };

export function spaceFocusReducer(state: SpaceFocus, action: SpaceFocusAction): SpaceFocus {
  if (action.type === "select") {
    return {
      selectedSpaceId: action.spaceId,
      hiddenSpaceIds: state.hiddenSpaceIds.filter((id) => id !== action.spaceId),
    };
  }
  const hidden = state.hiddenSpaceIds.includes(action.spaceId);
  return {
    selectedSpaceId: state.selectedSpaceId === action.spaceId ? null : state.selectedSpaceId,
    hiddenSpaceIds: action.type === "deleted" || hidden
      ? state.hiddenSpaceIds.filter((id) => id !== action.spaceId)
      : [...state.hiddenSpaceIds, action.spaceId],
  };
}

export function filterBySpace<T extends { category_id: string | null }>(items: T[], focus: SpaceFocus): T[] {
  const hidden = new Set(focus.hiddenSpaceIds);
  return items.filter((item) =>
    focus.selectedSpaceId !== null
      ? item.category_id === focus.selectedSpaceId && !hidden.has(item.category_id)
      : item.category_id === null || !hidden.has(item.category_id)
  );
}
