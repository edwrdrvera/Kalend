import { afterEach, describe, expect, it, mock } from "bun:test";
import { ensureDOM, renderHook } from "@/test-utils/render-hook";
import { useSpacePanel } from "@/hooks/useSpacePanel";
import type { CalendarCategory } from "@/lib/calendar-types";
import type { Dispatch } from "react";
import type { SpaceFocusAction } from "@/lib/space-focus";

ensureDOM();

const STORAGE_KEY = "kalend.branchPanel";
const SCHOOL: CalendarCategory = { id: "space-1", name: "School", color: "blue" };
const SAVED = {
  active: { branchId: "space-1:default", spaceId: "space-1" },
};

describe("useSpacePanel", () => {
  afterEach(() => localStorage.clear());

  it("keeps saved settings through StrictMode's double-run of mount effects", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const { act, unmount } = renderHook(() => useSpacePanel([], [], () => {}), { strict: true });
    await act(() => {});
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(SAVED);
    unmount();
  });

  it("reopens the saved branch and selects its Space", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const dispatchSpaceFocus = mock<Dispatch<SpaceFocusAction>>(() => {});
    const { result, act, unmount } = renderHook(
      () => useSpacePanel([SCHOOL], [], dispatchSpaceFocus),
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
      useSpacePanel([other], [], dispatchSpaceFocus)
    );
    await act(() => {});
    expect(result.current.activeBranch).toBeNull();
    expect(dispatchSpaceFocus).not.toHaveBeenCalled();
    unmount();
  });
});
