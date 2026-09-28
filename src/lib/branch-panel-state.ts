export type PanelSelection =
  | { kind: "branch"; branchId: string; spaceId: string }
  | { kind: "allTasks" }
  | { kind: "task"; taskId: string };

/** A request that would replace or close the current selection. */
export type PanelNavigation =
  | { type: "openBranch"; branchId: string; spaceId: string }
  | { type: "openAllTasks" }
  | { type: "openTask"; taskId: string }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null };

export interface BranchPanelState {
  active: PanelSelection | null;
  /** True while the open editor holds unsaved edits. */
  dirty: boolean;
  /** A navigation held back by unsaved edits until the user saves, discards, or stays. */
  pending: PanelNavigation | null;
}

export const initialBranchPanelState: BranchPanelState = {
  active: null,
  dirty: false,
  pending: null,
};

export type BranchPanelAction =
  | PanelNavigation
  | { type: "setDirty"; dirty: boolean }
  /** Carry out the pending navigation: the edits were saved or discarded. */
  | { type: "proceed" }
  /** Drop the pending navigation and keep editing. */
  | { type: "stay" };

// Returns `active` itself when the navigation changes nothing, which is how
// the reducer tells a no-op apart from a navigation the dirty guard must hold.
function navigate(active: PanelSelection | null, nav: PanelNavigation): PanelSelection | null {
  switch (nav.type) {
    case "openBranch":
      return active?.kind === "branch" && active.branchId === nav.branchId
        ? active
        : { kind: "branch", branchId: nav.branchId, spaceId: nav.spaceId };
    case "openAllTasks":
      return active?.kind === "allTasks" ? active : { kind: "allTasks" };
    case "openTask":
      return active?.kind === "task" && active.taskId === nav.taskId
        ? active
        : { kind: "task", taskId: nav.taskId };
    case "close":
      return null;
    case "spaceChanged":
      // All tasks and a task's details span every Space, so changing the
      // Space filter leaves them open. A Branch belongs to one Space.
      return active?.kind === "branch" ? null : active;
  }
}

export function branchPanelReducer(
  state: BranchPanelState,
  action: BranchPanelAction
): BranchPanelState {
  switch (action.type) {
    case "setDirty":
      return state.dirty === action.dirty ? state : { ...state, dirty: action.dirty };
    case "stay":
      return state.pending ? { ...state, pending: null } : state;
    case "proceed":
      if (!state.pending) return state;
      return { active: navigate(state.active, state.pending), dirty: false, pending: null };
    default: {
      const next = navigate(state.active, action);
      if (next === state.active) return state;
      if (state.dirty) return { ...state, pending: action };
      return { active: next, dirty: false, pending: null };
    }
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
    return { ...initialBranchPanelState, active: { kind: "branch", branchId, spaceId } };
  } catch {
    return initialBranchPanelState;
  }
}

export function saveBranchPanelState(state: BranchPanelState): void {
  const stored = {
    active: state.active?.kind === "branch" ? state.active : null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked (private mode, quota, disabled): persistence is
    // best-effort, never fatal.
  }
}
