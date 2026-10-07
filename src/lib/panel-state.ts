/** An overview an item can be opened from, and that Back returns to. */
export type PanelOverview =
  | { kind: "space"; spaceId: string }
  | { kind: "group"; groupId: string; spaceId: string }
  | { kind: "allTasks" };

export type PanelSelection =
  | PanelOverview
  | { kind: "task"; taskId: string; from: PanelOverview | null }
  | { kind: "event"; eventId: string; from: PanelOverview | null };

/** A request that would replace or close the current selection. */
export type PanelNavigation =
  | { type: "openSpace"; spaceId: string }
  | { type: "openGroup"; groupId: string; spaceId: string }
  | { type: "openAllTasks" }
  | { type: "openTask"; taskId: string }
  | { type: "openEvent"; eventId: string }
  /** Return to the overview the open item came from, or close without one. */
  | { type: "back" }
  | { type: "close" }
  | { type: "spaceChanged"; spaceId: string | null };

export interface PanelState {
  active: PanelSelection | null;
  /** True while the open editor holds unsaved edits. */
  dirty: boolean;
  /** A navigation held back by unsaved edits until the user saves, discards, or stays. */
  pending: PanelNavigation | null;
}

export const initialPanelState: PanelState = {
  active: null,
  dirty: false,
  pending: null,
};

export type PanelAction =
  | PanelNavigation
  | { type: "setDirty"; dirty: boolean }
  /** Carry out the pending navigation: the edits were saved or discarded. */
  | { type: "proceed" }
  /** Drop the pending navigation and keep editing. */
  | { type: "stay" }
  /** The open task or event no longer exists, so its unsaved edits can't block anything. */
  | { type: "itemGone" }
  /** A Group was deleted: its overview closes, and an item opened from it loses that Back target. */
  | { type: "groupGone"; groupId: string };

function backTargetCarriedFrom(active: PanelSelection | null): PanelOverview | null {
  if (active === null) return null;
  return active.kind === "task" || active.kind === "event" ? active.from : active;
}

// Returns `active` itself when the navigation changes nothing, which is how
// the reducer tells a no-op apart from a navigation the dirty guard must hold.
function navigate(active: PanelSelection | null, nav: PanelNavigation): PanelSelection | null {
  switch (nav.type) {
    case "openSpace":
      return active?.kind === "space" && active.spaceId === nav.spaceId
        ? active
        : { kind: "space", spaceId: nav.spaceId };
    case "openGroup":
      return active?.kind === "group" && active.groupId === nav.groupId
        ? active
        : { kind: "group", groupId: nav.groupId, spaceId: nav.spaceId };
    case "openAllTasks":
      return active?.kind === "allTasks" ? active : { kind: "allTasks" };
    case "openTask":
      return active?.kind === "task" && active.taskId === nav.taskId
        ? active
        : { kind: "task", taskId: nav.taskId, from: backTargetCarriedFrom(active) };
    case "openEvent":
      return active?.kind === "event" && active.eventId === nav.eventId
        ? active
        : { kind: "event", eventId: nav.eventId, from: backTargetCarriedFrom(active) };
    case "back":
      return active?.kind === "task" || active?.kind === "event" ? active.from : null;
    case "close":
      return null;
    case "spaceChanged":
      // All tasks and a task's details span every Space, so changing the Space
      // filter leaves them open. A Space overview is replaced by the new focus,
      // and a Group overview stays only while its own Space is the focus.
      if (active?.kind === "space") return null;
      if (active?.kind === "group") return active.spaceId === nav.spaceId ? active : null;
      return active;
  }
}

export function panelReducer(
  state: PanelState,
  action: PanelAction
): PanelState {
  switch (action.type) {
    case "setDirty":
      return state.dirty === action.dirty ? state : { ...state, dirty: action.dirty };
    case "stay":
      return state.pending ? { ...state, pending: null } : state;
    case "groupGone": {
      const { active } = state;
      if (active?.kind === "group" && active.groupId === action.groupId) {
        return { active: null, dirty: false, pending: null };
      }
      if (
        (active?.kind === "task" || active?.kind === "event") &&
        active.from?.kind === "group" &&
        active.from.groupId === action.groupId
      ) {
        return { ...state, active: { ...active, from: null } };
      }
      return state;
    }
    case "itemGone":
      if (!state.dirty && !state.pending) return state;
      return {
        active: state.pending ? navigate(state.active, state.pending) : state.active,
        dirty: false,
        pending: null,
      };
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

const STORAGE_KEY = "kalend.panel";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStoredOverview(
  value: unknown
): value is Extract<PanelSelection, { kind: "space" | "group" }> {
  if (!isPlainObject(value)) return false;
  if (value.kind === "space") return typeof value.spaceId === "string";
  return value.kind === "group" && typeof value.groupId === "string" && typeof value.spaceId === "string";
}

// Only a Space or Group overview is restored after a reload. Every other view,
// and any unrecognized stored value (including what an earlier version wrote
// under another key, which is never read), loads as a closed panel.
export function loadPanelState(): PanelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialPanelState;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed) || !isStoredOverview(parsed.active)) return initialPanelState;
    const { active } = parsed;
    return {
      ...initialPanelState,
      active:
        active.kind === "space"
          ? { kind: "space", spaceId: active.spaceId }
          : { kind: "group", groupId: active.groupId, spaceId: active.spaceId },
    };
  } catch {
    return initialPanelState;
  }
}

export function savePanelState(state: PanelState): void {
  const stored = {
    active: state.active?.kind === "space" || state.active?.kind === "group" ? state.active : null,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked (private mode, quota, disabled): persistence is
    // best-effort, never fatal.
  }
}
