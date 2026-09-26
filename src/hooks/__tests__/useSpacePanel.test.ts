import { afterEach, describe, expect, it } from "bun:test";
import { ensureDOM, renderHook } from "@/test-utils/render-hook";
import { useSpacePanel } from "@/hooks/useSpacePanel";

ensureDOM();

const STORAGE_KEY = "kalend.branchPanel";
const SAVED = { open: true, lastBranchBySpace: { "space-1": "branch-1" } };

describe("useSpacePanel", () => {
  afterEach(() => localStorage.clear());

  it("keeps saved settings through StrictMode's double-run of mount effects", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAVED));
    const { act, unmount } = renderHook(() => useSpacePanel([], [], () => {}), { strict: true });
    await act(() => {});
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(SAVED);
    unmount();
  });
});
