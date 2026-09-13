// Reducer + localStorage persistence for the Space Panel's open/closed state
// and which branch is active. Sibling of space-focus.ts (Space selection);
// mirrors its structure and style.

export interface BranchPanelState {
  /** Is a branch panel currently shown. */
  open: boolean;
  activeBranchId: string | null;
  /** spaceId -> last opened branchId, remembered across sessions. */
  lastBranchBySpace: Record<string, string>;
}

export const initialBranchPanelState: BranchPanelState = {
  open: false,
  activeBranchId: null,
  lastBranchBySpace: {},
};

type BranchPanelAction =
  | { type: "openBranch"; branchId: string; spaceId: string }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null }
  | { type: "cleared" }
  | { type: "hydrate"; state: BranchPanelState };

export function branchPanelReducer(
  state: BranchPanelState,
  action: BranchPanelAction
): BranchPanelState {
  switch (action.type) {
    case "openBranch":
      return {
        open: true,
        activeBranchId: action.branchId,
        lastBranchBySpace: {
          ...state.lastBranchBySpace,
          [action.spaceId]: action.branchId,
        },
      };
    case "close":
      return { ...state, open: false, activeBranchId: null };
    case "spaceChanged":
      // FR7: changing the active Space closes the panel. Does NOT auto-open
      // the new Space's branch, even if one was previously remembered.
      return { ...state, open: false, activeBranchId: null };
    case "cleared":
      return { ...state, open: false, activeBranchId: null };
    case "hydrate":
      return action.state;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kalend.branchPanel";

/** Subset of BranchPanelState that gets persisted to localStorage. */
type PersistedBranchPanelState = Pick<BranchPanelState, "open" | "lastBranchBySpace">;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPersistedState(value: unknown): value is PersistedBranchPanelState {
  if (!isPlainObject(value)) return false;
  if (typeof value.open !== "boolean") return false;
  if (!isPlainObject(value.lastBranchBySpace)) return false;
  return Object.values(value.lastBranchBySpace).every((v) => typeof v === "string");
}

/**
 * Only `open` and `lastBranchBySpace` are persisted ("remember open/closed
 * globally" + "remember last branch per Space"). `activeBranchId` always
 * comes back as null: a fresh session opens no specific branch until the
 * user acts. We could restore the last-opened branch for the last-active
 * Space, but there's no persisted "last active Space" to anchor that to
 * (Space selection lives in its own reducer/storage), so defaulting to null
 * keeps this module simple and self-contained.
 */
export function loadBranchPanelState(): BranchPanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialBranchPanelState;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) return initialBranchPanelState;
    return {
      open: parsed.open,
      activeBranchId: null,
      lastBranchBySpace: { ...parsed.lastBranchBySpace },
    };
  } catch {
    return initialBranchPanelState;
  }
}

export function saveBranchPanelState(state: BranchPanelState): void {
  try {
    const persisted: PersistedBranchPanelState = {
      open: state.open,
      lastBranchBySpace: state.lastBranchBySpace,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage blocked (private mode, quota, disabled) — persistence is
    // best-effort, never fatal.
  }
}
