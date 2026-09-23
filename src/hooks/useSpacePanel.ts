import { useEffect, useReducer, useState, type Dispatch } from "react";
import type { Branch } from "@/lib/branch-types";
import { resolveBranchTasks } from "@/lib/branch-types";
import { findBranch } from "@/lib/branch-stub";
import {
  branchPanelReducer,
  initialBranchPanelState,
  loadBranchPanelState,
  saveBranchPanelState,
} from "@/lib/branch-panel-state";
import type { CalendarTask, CalendarCategory } from "@/lib/calendar-types";
import type { spaceFocusReducer } from "@/lib/space-focus";

type SpaceFocusAction = Parameters<typeof spaceFocusReducer>[1];

type PanelMode = "pinned" | "sheet" | "fullscreen";

export function useSpacePanel(
  categories: CalendarCategory[],
  tasks: CalendarTask[],
  dispatchSpaceFocus: Dispatch<SpaceFocusAction>
) {
  const [branchPanel, dispatch] = useReducer(branchPanelReducer, initialBranchPanelState);
  const [panelMode, setPanelMode] = useState<PanelMode>("pinned");

  // Must stay above the save effect: loadBranchPanelState() reads storage
  // before the first save writes the initial state over it.
  useEffect(() => {
    dispatch({ type: "hydrate", state: loadBranchPanelState() });
  }, []);

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

  const activeBranch =
    branchPanel.open && branchPanel.activeBranchId
      ? findBranch(categories, branchPanel.activeBranchId)
      : null;

  return {
    panelMode,
    activeBranch,
    activeBranchId: branchPanel.activeBranchId,
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
