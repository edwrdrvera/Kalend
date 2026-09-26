export interface BranchPanelState {
  active: { branchId: string; spaceId: string } | null;
}

export const initialBranchPanelState: BranchPanelState = {
  active: null,
};

type BranchPanelAction =
  | { type: "openBranch"; branchId: string; spaceId: string }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null };

export function branchPanelReducer(
  _state: BranchPanelState,
  action: BranchPanelAction
): BranchPanelState {
  switch (action.type) {
    case "openBranch":
      return { active: { branchId: action.branchId, spaceId: action.spaceId } };
    case "close":
    case "spaceChanged":
      return { active: null };
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
  return isPlainObject(value) && isValidActive(value.active);
}

export function loadBranchPanelState(): BranchPanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialBranchPanelState;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) return initialBranchPanelState;
    return { active: parsed.active };
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
