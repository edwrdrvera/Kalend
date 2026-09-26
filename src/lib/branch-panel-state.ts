// Reducer + localStorage persistence for which Space Panel branch is open.
// Sibling of space-focus.ts (Space selection); mirrors its structure and style.

export interface BranchPanelState {
  /** The branch shown in the panel, or null when the panel is closed. */
  active: { branchId: string; spaceId: string } | null;
  /** spaceId -> last opened branchId, remembered across sessions. */
  lastBranchBySpace: Record<string, string>;
}

export const initialBranchPanelState: BranchPanelState = {
  active: null,
  lastBranchBySpace: {},
};

type BranchPanelAction =
  | { type: "openBranch"; branchId: string; spaceId: string }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null };

export function branchPanelReducer(
  state: BranchPanelState,
  action: BranchPanelAction
): BranchPanelState {
  switch (action.type) {
    case "openBranch":
      return {
        active: { branchId: action.branchId, spaceId: action.spaceId },
        lastBranchBySpace: {
          ...state.lastBranchBySpace,
          [action.spaceId]: action.branchId,
        },
      };
    case "close":
      return { ...state, active: null };
    case "spaceChanged":
      // FR7: changing the active Space closes the panel. Does NOT auto-open
      // the new Space's branch, even if one was previously remembered.
      return { ...state, active: null };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kalend.branchPanel";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidActive(value: unknown): value is BranchPanelState["active"] {
  if (value === null) return true;
  return (
    isPlainObject(value) && typeof value.branchId === "string" && typeof value.spaceId === "string"
  );
}

function isValidPersistedState(value: unknown): value is BranchPanelState {
  if (!isPlainObject(value)) return false;
  if (!isValidActive(value.active)) return false;
  if (!isPlainObject(value.lastBranchBySpace)) return false;
  return Object.values(value.lastBranchBySpace).every((v) => typeof v === "string");
}

/**
 * The stored branch may no longer exist (its Space was deleted since the
 * save). useSpacePanel resolves it against the loaded categories and shows
 * no panel when it doesn't resolve, so no check is needed here.
 */
export function loadBranchPanelState(): BranchPanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialBranchPanelState;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) return initialBranchPanelState;
    return {
      active: parsed.active,
      lastBranchBySpace: { ...parsed.lastBranchBySpace },
    };
  } catch {
    return initialBranchPanelState;
  }
}

export function saveBranchPanelState(state: BranchPanelState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private mode, quota, disabled) — persistence is
    // best-effort, never fatal.
  }
}
