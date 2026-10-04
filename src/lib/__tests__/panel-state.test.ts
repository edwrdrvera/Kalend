import { afterEach, beforeEach, describe, expect, it } from "bun:test";
// happy-dom globals (including `localStorage`) must be installed before
// importing a module that references them at call time.
import "../../components/__tests__/test-dom";
import {
  panelReducer,
  initialPanelState,
  loadPanelState,
  savePanelState,
  type PanelState,
} from "../panel-state";

const SCHOOL = { kind: "space" as const, spaceId: "cat-school" };
const BIO = { kind: "group" as const, groupId: "group-bio", spaceId: "cat-school" };
const withActive = (active: PanelState["active"]): PanelState => ({
  ...initialPanelState,
  active,
});

describe("panelReducer", () => {
  it("openSpace opens the panel on that Space", () => {
    const next = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    expect(next).toEqual(withActive(SCHOOL));
  });

  it("openSpace for another Space switches the panel to that Space", () => {
    const first = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    const second = panelReducer(first, { type: "openSpace", spaceId: "cat-work" });
    expect(second).toEqual(withActive({ kind: "space", spaceId: "cat-work" }));
  });

  it("openAllTasks replaces an open Space with the All tasks view", () => {
    const open = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    expect(panelReducer(open, { type: "openAllTasks" })).toEqual(withActive({ kind: "allTasks" }));
  });

  it("spaceChanged leaves the All tasks view open", () => {
    const allTasks = panelReducer(initialPanelState, { type: "openAllTasks" });
    const changed = panelReducer(allTasks, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual(withActive({ kind: "allTasks" }));
  });

  it("close closes the panel", () => {
    const open = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    expect(panelReducer(open, { type: "close" })).toEqual(withActive(null));
  });

  it("spaceChanged closes the panel (FR7)", () => {
    const open = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    const changed = panelReducer(open, { type: "spaceChanged", spaceId: "cat-work" });
    expect(changed).toEqual(withActive(null));
  });

  it("spaceChanged to null (All Spaces) also closes the panel", () => {
    const open = panelReducer(initialPanelState, { type: "openSpace", spaceId: "cat-school" });
    const changed = panelReducer(open, { type: "spaceChanged", spaceId: null });
    expect(changed.active).toBeNull();
  });
});

describe("opening a Group", () => {
  it("openGroup opens the panel on that Group and remembers its Space", () => {
    const next = panelReducer(initialPanelState, { type: "openGroup", groupId: "group-bio", spaceId: "cat-school" });
    expect(next).toEqual(withActive(BIO));
  });

  it("openGroup on the open Group changes nothing", () => {
    const state = withActive(BIO);
    expect(panelReducer(state, { type: "openGroup", groupId: "group-bio", spaceId: "cat-school" })).toBe(state);
  });

  it("switches between a Space and one of its Groups", () => {
    const group = panelReducer(withActive(SCHOOL), { type: "openGroup", groupId: "group-bio", spaceId: "cat-school" });
    expect(group).toEqual(withActive(BIO));
    expect(panelReducer(group, { type: "openSpace", spaceId: "cat-school" })).toEqual(withActive(SCHOOL));
  });

  it("spaceChanged keeps a Group open while its own Space is the focus", () => {
    const state = withActive(BIO);
    expect(panelReducer(state, { type: "spaceChanged", spaceId: "cat-school" })).toBe(state);
  });

  it("spaceChanged closes a Group when another Space or All Spaces takes the focus", () => {
    expect(panelReducer(withActive(BIO), { type: "spaceChanged", spaceId: "cat-work" })).toEqual(withActive(null));
    expect(panelReducer(withActive(BIO), { type: "spaceChanged", spaceId: null })).toEqual(withActive(null));
  });

  it("an item opened from a Group goes Back to that Group", () => {
    const task = panelReducer(withActive(BIO), { type: "openTask", taskId: "task-1" });
    expect(task).toEqual(withActive({ kind: "task", taskId: "task-1", from: BIO }));
    expect(panelReducer(task, { type: "back" })).toEqual(withActive(BIO));
  });
});

describe("a deleted Group", () => {
  it("closes its own overview", () => {
    expect(panelReducer(withActive(BIO), { type: "groupGone", groupId: "group-bio" })).toEqual(initialPanelState);
  });

  it("leaves another Group's overview open", () => {
    const state = withActive(BIO);
    expect(panelReducer(state, { type: "groupGone", groupId: "group-other" })).toBe(state);
  });

  it("an open item keeps showing but loses the deleted Group as its Back target", () => {
    const task = withActive({ kind: "task", taskId: "task-1", from: BIO });
    expect(panelReducer(task, { type: "groupGone", groupId: "group-bio" })).toEqual(
      withActive({ kind: "task", taskId: "task-1", from: null })
    );
  });

  it("does not disturb an item opened from the Space", () => {
    const task = withActive({ kind: "task", taskId: "task-1", from: SCHOOL });
    expect(panelReducer(task, { type: "groupGone", groupId: "group-bio" })).toBe(task);
  });
});

describe("task selection and the unsaved-edits guard", () => {
  const TASK = { kind: "task" as const, taskId: "task-1", from: null };
  const openTask = (taskId: string) => ({ type: "openTask" as const, taskId });
  const dirtyTask = (): PanelState => ({ active: TASK, dirty: true, pending: null });

  it("openTask replaces any selection with that task's details", () => {
    const next = panelReducer(withActive(SCHOOL), openTask("task-1"));
    expect(next).toEqual(withActive({ ...TASK, from: SCHOOL }));
  });

  it("spaceChanged leaves a task's details open", () => {
    const next = panelReducer(withActive(TASK), { type: "spaceChanged", spaceId: "cat-work" });
    expect(next).toEqual(withActive(TASK));
  });

  it("does not restore a task's details after a reload", () => {
    savePanelState(withActive(TASK));
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  const leaving = [
    { name: "close", action: { type: "close" as const } },
    { name: "opening another task", action: openTask("task-2") },
    { name: "opening All tasks", action: { type: "openAllTasks" as const } },
    {
      name: "opening a Space",
      action: { type: "openSpace" as const, spaceId: SCHOOL.spaceId },
    },
  ];

  for (const { name, action } of leaving) {
    it(`holds ${name} as pending while edits are unsaved`, () => {
      const next = panelReducer(dirtyTask(), action);
      expect(next).toEqual({ active: TASK, dirty: true, pending: action });
    });
  }

  it("lets a clean editor navigate immediately", () => {
    const next = panelReducer(withActive(TASK), { type: "close" });
    expect(next).toEqual(initialPanelState);
  });

  it("ignores navigation that would keep the same selection, even when dirty", () => {
    const state = dirtyTask();
    expect(panelReducer(state, openTask("task-1"))).toBe(state);
    expect(panelReducer(state, { type: "spaceChanged", spaceId: null })).toBe(state);
  });

  it("proceed carries out the pending navigation and clears dirty", () => {
    const held = panelReducer(dirtyTask(), openTask("task-2"));
    expect(panelReducer(held, { type: "proceed" })).toEqual(
      withActive({ kind: "task", taskId: "task-2", from: null })
    );
  });

  it("proceed after a pending close closes the panel", () => {
    const held = panelReducer(dirtyTask(), { type: "close" });
    expect(panelReducer(held, { type: "proceed" })).toEqual(initialPanelState);
  });

  it("stay drops the pending navigation and keeps the edits", () => {
    const held = panelReducer(dirtyTask(), { type: "close" });
    expect(panelReducer(held, { type: "stay" })).toEqual(dirtyTask());
  });

  it("proceed with nothing pending changes nothing", () => {
    const state = dirtyTask();
    expect(panelReducer(state, { type: "proceed" })).toBe(state);
  });

  it("a later navigation replaces the one already pending", () => {
    const held = panelReducer(dirtyTask(), { type: "close" });
    const next = panelReducer(held, openTask("task-2"));
    expect(next.pending).toEqual(openTask("task-2"));
    expect(next.active).toEqual(TASK);
  });
});

describe("item origin and Back", () => {
  const ALL_TASKS = { kind: "allTasks" as const };
  const EVENT_FROM_SCHOOL = { kind: "event" as const, eventId: "event-1", from: SCHOOL };

  it("openEvent records the overview it was opened from", () => {
    const next = panelReducer(withActive(SCHOOL), { type: "openEvent", eventId: "event-1" });
    expect(next).toEqual(withActive(EVENT_FROM_SCHOOL));
  });

  it("openEvent with nothing open has no origin", () => {
    const next = panelReducer(initialPanelState, { type: "openEvent", eventId: "event-1" });
    expect(next).toEqual(withActive({ kind: "event", eventId: "event-1", from: null }));
  });

  it("opening an item from another item keeps the first item's origin", () => {
    const next = panelReducer(withActive(EVENT_FROM_SCHOOL), { type: "openTask", taskId: "task-1" });
    expect(next).toEqual(withActive({ kind: "task", taskId: "task-1", from: SCHOOL }));
  });

  it("back returns a task opened from All tasks to All tasks", () => {
    const task = panelReducer(withActive(ALL_TASKS), { type: "openTask", taskId: "task-1" });
    expect(panelReducer(task, { type: "back" })).toEqual(withActive(ALL_TASKS));
  });

  it("back returns an event to the Space it was opened from", () => {
    expect(panelReducer(withActive(EVENT_FROM_SCHOOL), { type: "back" })).toEqual(withActive(SCHOOL));
  });

  it("back closes the panel when the item has no origin", () => {
    const event = withActive({ kind: "event", eventId: "event-1", from: null });
    expect(panelReducer(event, { type: "back" })).toEqual(initialPanelState);
  });

  it("back is held by unsaved edits, and proceed then returns to the origin", () => {
    const dirty: PanelState = { active: EVENT_FROM_SCHOOL, dirty: true, pending: null };
    const held = panelReducer(dirty, { type: "back" });
    expect(held).toEqual({ ...dirty, pending: { type: "back" } });
    expect(panelReducer(held, { type: "proceed" })).toEqual(withActive(SCHOOL));
  });

  it("does not restore an event's details after a reload", () => {
    savePanelState(withActive(EVENT_FROM_SCHOOL));
    expect(loadPanelState()).toEqual(initialPanelState);
  });
});

describe("panel persistence", () => {
  const STORAGE_KEY = "kalend.panel";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips the open Space through save/load", () => {
    const state: PanelState = withActive(SCHOOL);
    savePanelState(state);
    expect(loadPanelState()).toEqual(state);
  });

  it("round-trips a closed panel as closed", () => {
    const state: PanelState = withActive(null);
    savePanelState(state);
    expect(loadPanelState()).toEqual(state);
  });

  it("still restores the open Space from a value with extra keys", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: SCHOOL, extra: { "cat-school": 1 } })
    );
    expect(loadPanelState()).toEqual(withActive(SCHOOL));
  });

  it("returns the initial state when nothing is stored", () => {
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("returns the initial state when the stored value is malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("ignores what an earlier version stored under its own key", () => {
    localStorage.setItem(
      "kalend.branchPanel",
      JSON.stringify({ active: { kind: "branch", branchId: "cat-school:default", spaceId: "cat-school" } })
    );
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("round-trips an open Group", () => {
    const state: PanelState = withActive(BIO);
    savePanelState(state);
    expect(loadPanelState()).toEqual(state);
  });

  it("returns the initial state for a Group missing its Space", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: { kind: "group", groupId: "group-bio" } }));
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("does not restore the All tasks view after a reload", () => {
    savePanelState(withActive({ kind: "allTasks" }));
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("returns the initial state when active is missing its spaceId", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ active: { kind: "space" } })
    );
    expect(loadPanelState()).toEqual(initialPanelState);
  });

  it("load never throws when storage access itself throws", () => {
    const originalGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = () => {
      throw new Error("storage blocked");
    };
    try {
      expect(loadPanelState()).toEqual(initialPanelState);
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
      expect(() => savePanelState(initialPanelState)).not.toThrow();
    } finally {
      localStorage.setItem = originalSetItem;
    }
  });
});

describe("itemGone", () => {
  const EVENT_SEL = { kind: "event" as const, eventId: "e1", from: null };

  it("clears the dirty flag so the next navigation opens immediately", () => {
    const gone = panelReducer(
      { active: EVENT_SEL, dirty: true, pending: null },
      { type: "itemGone" }
    );
    expect(gone.dirty).toBe(false);
    const next = panelReducer(gone, { type: "openAllTasks" });
    expect(next).toEqual({ active: { kind: "allTasks" }, dirty: false, pending: null });
  });

  it("carries out a navigation that was held back", () => {
    const next = panelReducer(
      { active: EVENT_SEL, dirty: true, pending: { type: "openAllTasks" } },
      { type: "itemGone" }
    );
    expect(next).toEqual({ active: { kind: "allTasks" }, dirty: false, pending: null });
  });

  it("does nothing when nothing is dirty or pending", () => {
    const state = { active: EVENT_SEL, dirty: false, pending: null };
    expect(panelReducer(state, { type: "itemGone" })).toBe(state);
  });
});
