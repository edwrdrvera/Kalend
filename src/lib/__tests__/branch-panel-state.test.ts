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

describe("branchPanelReducer", () => {
  it("openBranch opens the panel, sets the active branch, and records it as the Space's last branch", () => {
    const next = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    expect(next).toEqual({
      open: true,
      activeBranchId: "cat-school:default",
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
    expect(second.activeBranchId).toBe("cat-work:default");
  });

  it("close clears the active branch and closes the panel, but keeps lastBranchBySpace", () => {
    const open = branchPanelReducer(initialBranchPanelState, {
      type: "openBranch",
      branchId: "cat-school:default",
      spaceId: "cat-school",
    });
    const closed = branchPanelReducer(open, { type: "close" });
    expect(closed).toEqual({
      open: false,
      activeBranchId: null,
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
      open: false,
      activeBranchId: null,
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
    expect(changed.open).toBe(false);
    expect(changed.activeBranchId).toBeNull();
  });

  it("an unknown action returns the same state unchanged", () => {
    const state: BranchPanelState = {
      open: true,
      activeBranchId: "cat-school:default",
      lastBranchBySpace: { "cat-school": "cat-school:default" },
    };
    // @ts-expect-error deliberately invalid action to exercise the default branch
    const next = branchPanelReducer(state, { type: "notARealAction" });
    expect(next).toBe(state);
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

  it("round-trips the persisted subset (open + lastBranchBySpace) through save/load", () => {
    const state: BranchPanelState = {
      open: true,
      activeBranchId: "cat-school:default",
      lastBranchBySpace: { "cat-school": "cat-school:default", "cat-work": "cat-work:default" },
    };
    saveBranchPanelState(state);
    const loaded = loadBranchPanelState();
    expect(loaded.open).toBe(true);
    expect(loaded.lastBranchBySpace).toEqual(state.lastBranchBySpace);
  });

  it("activeBranchId always comes back null after load, even if it was open when saved", () => {
    saveBranchPanelState({
      open: true,
      activeBranchId: "cat-school:default",
      lastBranchBySpace: {},
    });
    expect(loadBranchPanelState().activeBranchId).toBeNull();
  });

  it("returns the initial state when nothing is stored", () => {
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when the stored value is malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when the stored shape is invalid (open not boolean)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: "yes", lastBranchBySpace: {} }));
    expect(loadBranchPanelState()).toEqual(initialBranchPanelState);
  });

  it("returns the initial state when lastBranchBySpace is not a plain object", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, lastBranchBySpace: ["nope"] }));
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
      expect(() =>
        saveBranchPanelState({ open: true, activeBranchId: null, lastBranchBySpace: {} })
      ).not.toThrow();
    } finally {
      localStorage.setItem = originalSetItem;
    }
  });
});
