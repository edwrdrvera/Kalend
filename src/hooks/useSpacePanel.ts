import { useEffect, useReducer, useState, type Dispatch } from "react";
import type { Branch } from "@/lib/branch-types";
import { resolveBranchTasks } from "@/lib/branch-types";
import { findBranch } from "@/lib/branch-stub";
import {
  branchPanelReducer,
  loadBranchPanelState,
  saveBranchPanelState,
} from "@/lib/branch-panel-state";
import type { CalendarTask, CalendarCategory } from "@/lib/calendar-types";
import type { SpaceFocusAction } from "@/lib/space-focus";

type PanelMode = "pinned" | "sheet" | "fullscreen";

export function useSpacePanel(
  categories: CalendarCategory[],
  tasks: CalendarTask[],
  dispatchSpaceFocus: Dispatch<SpaceFocusAction>
) {
  // Read storage in the initializer, not a mount effect: StrictMode's second
  // effect run would restore what the first save had already overwritten.
  const [branchPanel, dispatch] = useReducer(branchPanelReducer, undefined, loadBranchPanelState);
  const [panelMode, setPanelMode] = useState<PanelMode>("pinned");

  useEffect(() => {
    saveBranchPanelState(branchPanel);
  }, [branchPanel]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPanelMode(w >= 1200 ? "pinned" : w >= 900 ? "sheet" : "fullscreen");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const activeBranch = branchPanel.active
    ? findBranch(categories, branchPanel.active.branchId)
    : null;
  const activeSpaceId = activeBranch?.spaceId ?? null;

  useEffect(() => {
    if (activeSpaceId !== null) dispatchSpaceFocus({ type: "select", spaceId: activeSpaceId });
  }, [activeSpaceId, dispatchSpaceFocus]);

  return {
    panelMode,
    activeBranch,
    activeBranchId: branchPanel.active?.branchId ?? null,
    panelTasks: activeBranch ? resolveBranchTasks(activeBranch, tasks) : [],
    openBranch: (branch: Branch) => {
      dispatchSpaceFocus({ type: "select", spaceId: branch.spaceId });
      dispatch({ type: "openBranch", branchId: branch.id, spaceId: branch.spaceId });
    },
    close: () => dispatch({ type: "close" }),
    selectSpace: (spaceId: string | null) => {
      dispatchSpaceFocus({ type: "select", spaceId });
      dispatch({ type: "spaceChanged", spaceId });
    },
  };
}
