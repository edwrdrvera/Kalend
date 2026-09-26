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

const SCHOOL = { branchId: "cat-school:default", spaceId: "cat-school" };

describe("branchPanelReducer", () => {
  it("openBranch opens the panel on that branch", () => {
    const next = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(next).toEqual({ active: SCHOOL });
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
    expect(second).toEqual({ active: { branchId: "cat-work:default", spaceId: "cat-work" } });
  });

  it("close closes the panel", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(branchPanelReducer(open, { type: "close" })).toEqual({ active: null });
  });

  it("spaceChanged closes the panel (FR7)", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const changed = branchPanelReducer(open, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual({ active: null });
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

describe("branch panel persistence", () => {
  const STORAGE_KEY = "kalend.branchPanel";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips the open branch through save/load", () => {
    const state: BranchPanelState = { active: SCHOOL };
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
  });

  it("round-trips a closed panel as closed", () => {
    const state: BranchPanelState = { active: null };
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
  });

  it("still restores the open branch from a value that also has lastBranchBySpace", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: SCHOOL, lastBranchBySpace: { "cat-school": "cat-school:default" } })
    );
    expect(loadBranchPanelState()).toEqual({ active: SCHOOL });
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

  it("returns the initial state when active is missing its spaceId", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: { branchId: "cat-school:default" } })
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
