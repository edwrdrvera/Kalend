import { afterEach, describe, expect, it, mock } from "bun:test";
import { ensureDOM, renderHook } from "@/test-utils/render-hook";
import { useSpacePanel } from "@/hooks/useSpacePanel";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";
import { useState, type Dispatch } from "react";
import { branchesForSpaces } from "@/lib/branch-stub";
import type { SpaceFocusAction } from "@/lib/space-focus";

ensureDOM();

const STORAGE_KEY = "kalend.branchPanel";
const SCHOOL: CalendarCategory = { id: "space-1", name: "School", color: "blue" };
const SAVED = {
  active: { kind: "branch", branchId: "space-1:default", spaceId: "space-1" },
};

describe("useSpacePanel", () => {
  afterEach(() => localStorage.clear());

  it("keeps saved settings through StrictMode's double-run of mount effects", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const { act, unmount } = renderHook(() => useSpacePanel([], [], [], () => {}), { strict: true });
    await act(() => {});
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(SAVED);
    unmount();
  });

  it("reopens the saved branch and selects its Space", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const dispatchSpaceFocus = mock<Dispatch<SpaceFocusAction>>(() => {});
    const { result, act, unmount } = renderHook(
      () => useSpacePanel([SCHOOL], [], [], dispatchSpaceFocus),
      { strict: true }
    );
    await act(() => {});
    expect(result.current.activeBranch?.id).toBe("space-1:default");
    expect(result.current.activeBranchId).toBe("space-1:default");
    expect(dispatchSpaceFocus).toHaveBeenCalledWith({ type: "select", spaceId: "space-1" });
    unmount();
  });

  it("shows no panel and applies no Space filter when the saved branch's Space is gone", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const dispatchSpaceFocus = mock<Dispatch<SpaceFocusAction>>(() => {});
    const other: CalendarCategory = { id: "space-2", name: "Work", color: "red" };
    const { result, act, unmount } = renderHook(() =>
      useSpacePanel([other], [], [], dispatchSpaceFocus)
    );
    await act(() => {});
    expect(result.current.activeBranch).toBeNull();
    expect(dispatchSpaceFocus).not.toHaveBeenCalled();
    unmount();
  });

  const TASK: CalendarTask = {
    id: "task-1",
    title: "Essay",
    due_at: null,
    completed: false,
    color: null,
    color_overridden: false,
    category_id: null,
  };

  it("shows a task's details, and nothing once that task is deleted", async () => {
    const { result, act, unmount } = renderHook(() => {
      const [tasks, setTasks] = useState([TASK]);
      return { ...useSpacePanel([], tasks, [], () => {}), setTasks };
    });
    await act(() => {});
    await act(() => result.current.openTask(TASK));
    expect(result.current.activeTask).toEqual(TASK);

    await act(() => result.current.setTasks([]));
    expect(result.current.activeTask).toBeNull();
    unmount();
  });

  it("holds a Branch open request, and its Space focus, while the task editor is dirty", async () => {
    const dispatchSpaceFocus = mock<Dispatch<SpaceFocusAction>>(() => {});
    const { result, act, unmount } = renderHook(() =>
      useSpacePanel([SCHOOL], [TASK], [], dispatchSpaceFocus)
    );
    await act(() => {});
    await act(() => result.current.openTask(TASK));
    await act(() => result.current.setEditorDirty(true));
    await act(() => result.current.openBranch(branchesForSpaces([SCHOOL])[0]));
    expect(result.current.navigationPending).toBe(true);
    expect(result.current.activeTask).toEqual(TASK);
    expect(dispatchSpaceFocus).not.toHaveBeenCalled();

    await act(() => result.current.proceedNavigation());
    expect(result.current.activeBranchId).toBe("space-1:default");
    expect(dispatchSpaceFocus).toHaveBeenCalledWith({ type: "select", spaceId: "space-1" });
    unmount();
  });
});
