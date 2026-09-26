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
  it("openBranch opens the panel, sets the active branch, and records it as the Space's last branch", () => {
    const next = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(next).toEqual({
      active: SCHOOL,
      lastBranchBySpace: { "cat-school": "cat-school:default" },
    });
  });

  it("openBranch for a second Space preserves the first Space's remembered branch", () => {
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
    expect(second.lastBranchBySpace).toEqual({
      "cat-school": "cat-school:default",
      "cat-work": "cat-work:default",
    });
    expect(second.active).toEqual({ branchId: "cat-work:default", spaceId: "cat-work" });
  });

  it("close clears the active branch and closes the panel, but keeps lastBranchBySpace", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const closed = branchPanelReducer(open, { type: "close" });
    expect(closed).toEqual({
      active: null,
      lastBranchBySpace: { "cat-school": "cat-school:default" },
    });
  });

  it("spaceChanged closes the panel and does not auto-open the new Space's remembered branch (FR7)", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const changed = branchPanelReducer(open, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual({
      active: null,
      lastBranchBySpace: { "cat-school": "cat-school:default" },
    });
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

  it("round-trips the open branch and lastBranchBySpace through save/load", () => {
    const state: BranchPanelState = {
      active: SCHOOL,
      lastBranchBySpace: { "cat-school": "cat-school:default", "cat-work": "cat-work:default" },
    };
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
  });

  it("round-trips a closed panel as closed", () => {
    const state: BranchPanelState = {
      active: null,
      lastBranchBySpace: { "cat-school": "cat-school:default" },
    };
    saveBranchPanelState(state);
    expect(loadBranchPanelState()).toEqual(state);
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
      JSON.stringify({ active: { branchId: "cat-school:default" }, lastBranchBySpace: {} })
    );
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when lastBranchBySpace is not a plain object", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: null, lastBranchBySpace: ["nope"] }));
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
