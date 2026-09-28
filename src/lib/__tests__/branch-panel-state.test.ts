import { afterEach, beforeEach, describe, expect, it } from "bun:test";
// happy-dom globals (including `localStorage`) must be installed before
// importing a module that references them at call time.
import "../../components/__tests__/test-dom";
import {
  branchPanelReducer,
  initialBranchPanelState,
  loadBranchPanelState,
  saveBranchPanelState,
  type BranchPanelState,
} from "../branch-panel-state";

const SCHOOL = { kind: "branch" as const, branchId: "cat-school:default", spaceId: "cat-school" };
const withActive = (active: BranchPanelState["active"]): BranchPanelState => ({
  ...initialBranchPanelState,
  active,
});

describe("branchPanelReducer", () => {
  it("openBranch opens the panel on that branch", () => {
    const next = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(next).toEqual(withActive(SCHOOL));
  });

  it("openBranch for another Space switches the panel to that branch", () => {
    const first = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const second = branchPanelReducer(first, {
      type: "openBranch",
      branchId: "cat-work:default",
      spaceId: "cat-work",
    });
    expect(second).toEqual(withActive({ kind: "branch", branchId: "cat-work:default", spaceId: "cat-work" }));
  });

  it("openAllTasks replaces an open branch with the All tasks view", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(branchPanelReducer(open, { type: "openAllTasks" })).toEqual(withActive({ kind: "allTasks" }));
  });

  it("spaceChanged leaves the All tasks view open", () => {
    const allTasks = branchPanelReducer(initialBranchPanelState, { type: "openAllTasks" });
    const changed = branchPanelReducer(allTasks, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual(withActive({ kind: "allTasks" }));
  });

  it("close closes the panel", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(branchPanelReducer(open, { type: "close" })).toEqual(withActive(null));
  });

  it("spaceChanged closes the panel (FR7)", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const changed = branchPanelReducer(open, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual(withActive(null));
  });

  it("spaceChanged to null (All Spaces) also closes the panel", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const changed = branchPanelReducer(open, { type: "spaceChanged", spaceId: null });
    expect(changed.active).toBeNull();
  });
});

describe("task selection and the unsaved-edits guard", () => {
  const TASK = { kind: "task" as const, taskId: "task-1" };
  const openTask = (taskId: string) => ({ type: "openTask" as const, taskId });
  const dirtyTask = (): BranchPanelState => ({ active: TASK, dirty: true, pending: null });

  it("openTask replaces any selection with that task's details", () => {
    const next = branchPanelReducer(withActive(SCHOOL), openTask("task-1"));
    expect(next).toEqual(withActive(TASK));
  });

  it("spaceChanged leaves a task's details open", () => {
    const next = branchPanelReducer(withActive(TASK), { type: "spaceChanged", spaceId: "cat-work" });
    expect(next).toEqual(withActive(TASK));
  });

  it("does not restore a task's details after a reload", () => {
    saveBranchPanelState(withActive(TASK));
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  const leaving = [
    { name: "close", action: { type: "close" as const } },
    { name: "opening another task", action: openTask("task-2") },
    { name: "opening All tasks", action: { type: "openAllTasks" as const } },
    {
      name: "opening a Branch",
      action: { type: "openBranch" as const, branchId: SCHOOL.branchId, spaceId: SCHOOL.spaceId },
    },
  ];

  for (const { name, action } of leaving) {
    it(`holds ${name} as pending while edits are unsaved`, () => {
      const next = branchPanelReducer(dirtyTask(), action);
      expect(next).toEqual({ active: TASK, dirty: true, pending: action });
    });
  }

  it("lets a clean editor navigate immediately", () => {
    const next = branchPanelReducer(withActive(TASK), { type: "close" });
    expect(next).toEqual(initialBranchPanelState);
  });

  it("ignores navigation that would keep the same selection, even when dirty", () => {
    const state = dirtyTask();
    expect(branchPanelReducer(state, openTask("task-1"))).toBe(state);
    expect(branchPanelReducer(state, { type: "spaceChanged", spaceId: null })).toBe(state);
  });

  it("proceed carries out the pending navigation and clears dirty", () => {
    const held = branchPanelReducer(dirtyTask(), openTask("task-2"));
    expect(branchPanelReducer(held, { type: "proceed" })).toEqual(
      withActive({ kind: "task", taskId: "task-2" })
    );
  });

  it("proceed after a pending close closes the panel", () => {
    const held = branchPanelReducer(dirtyTask(), { type: "close" });
    expect(branchPanelReducer(held, { type: "proceed" })).toEqual(initialBranchPanelState);
  });

  it("stay drops the pending navigation and keeps the edits", () => {
    const held = branchPanelReducer(dirtyTask(), { type: "close" });
    expect(branchPanelReducer(held, { type: "stay" })).toEqual(dirtyTask());
  });

  it("proceed with nothing pending changes nothing", () => {
    const state = dirtyTask();
    expect(branchPanelReducer(state, { type: "proceed" })).toBe(state);
  });

  it("a later navigation replaces the one already pending", () => {
    const held = branchPanelReducer(dirtyTask(), { type: "close" });
    const next = branchPanelReducer(held, openTask("task-2"));
    expect(next.pending).toEqual(openTask("task-2"));
    expect(next.active).toEqual(TASK);
  });
});

describe("branch panel persistence", () => {
  const STORAGE_KEY = "kalend.branchPanel";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips the open branch through save/load", () => {
    const state: BranchPanelState = withActive(SCHOOL);
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
  });

  it("round-trips a closed panel as closed", () => {
    const state: BranchPanelState = withActive(null);
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
  });

  it("still restores the open branch from a value that also has lastBranchBySpace", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: SCHOOL, lastBranchBySpace: { "cat-school": "cat-school:default" } })
    );
    expect(loadBranchPanelState()).toEqual(withActive(SCHOOL));
  });

  it("returns the initial state when nothing is stored", () => {
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when the stored value is malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state for the old { open, lastBranchBySpace } format", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ open: true, lastBranchBySpace: { "cat-school": "cat-school:default" } })
    );
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("loads the pre-union { active: { branchId, spaceId } } shape as closed", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: { branchId: "cat-school:default", spaceId: "cat-school" } })
    );
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("does not restore the All tasks view after a reload", () => {
    saveBranchPanelState(withActive({ kind: "allTasks" }));
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when active is missing its spaceId", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: { kind: "branch", branchId: "cat-school:default" } })
    );
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("load never throws when storage access itself throws", () => {
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("storage blocked");
    };
    try {
      expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
    } finally {
      localStorage.getItem = originalGetItem;
    }
  });

  it("save never throws when storage access itself throws", () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error("storage blocked");
    };
    try {
      expect(() => saveBranchPanelState(initialBranchPanelState)).not.toThrow();
    } finally {
      localStorage.setItem = originalSetItem;
    }
  });
});
