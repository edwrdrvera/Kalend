export type PanelSelection =
  | { kind: "branch"; branchId: string; spaceId: string }
  | { kind: "allTasks" };

export interface BranchPanelState {
  active: PanelSelection | null;
}

export const initialBranchPanelState: BranchPanelState = {
  active: null,
};

type BranchPanelAction =
  | { type: "openBranch"; branchId: string; spaceId: string }
  | { type: "openAllTasks" }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null };

export function branchPanelReducer(
  state: BranchPanelState,
  action: BranchPanelAction
): BranchPanelState {
  switch (action.type) {
    case "openBranch":
      return {
        active: { kind: "branch", branchId: action.branchId, spaceId: action.spaceId },
      };
    case "openAllTasks":
      return { active: { kind: "allTasks" } };
    case "close":
      return { active: null };
    case "spaceChanged":
      // All tasks spans every Space, so changing the Space filter leaves it open.
      return state.active?.kind === "allTasks" ? state : { active: null };
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "kalend.branchPanel";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredBranch(
  value: unknown
): value is Extract<PanelSelection, { kind: "branch" }> {
  return (
    isPlainObject(value) &&
    value.kind === "branch" &&
    typeof value.branchId === "string" &&
    typeof value.spaceId === "string"
  );
}

// Only a Branch overview is restored after a reload. Every other view, and any
// unrecognized stored value, loads as a closed panel.
export function loadBranchPanelState(): BranchPanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialBranchPanelState;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed) || !isStoredBranch(parsed.active)) {
      return initialBranchPanelState;
    }
    const { branchId, spaceId } = parsed.active;
    return { active: { kind: "branch", branchId, spaceId } };
  } catch {
    return initialBranchPanelState;
  }
}

export function saveBranchPanelState(state: BranchPanelState): void {
  const stored: BranchPanelState = {
    active: state.active?.kind === "branch" ? state.active : null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked (private mode, quota, disabled): persistence is
    // best-effort, never fatal.
  }
}
