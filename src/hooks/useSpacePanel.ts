import { useEffect, useReducer, useState, type Dispatch } from "react";
import type { Branch } from "@/lib/branch-types";
import { resolveBranchTasks } from "@/lib/branch-types";
import { findBranch } from "@/lib/branch-stub";
import {
  branchPanelReducer,
  loadBranchPanelState,
  saveBranchPanelState,
} from "@/lib/branch-panel-state";
import type { CalendarEvent, CalendarTask, CalendarCategory } from "@/lib/calendar-types";
import type { SpaceFocusAction } from "@/lib/space-focus";

type PanelMode = "pinned" | "sheet" | "fullscreen";

export function useSpacePanel(
  categories: CalendarCategory[],
  tasks: CalendarTask[],
  events: CalendarEvent[],
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

  const selection = branchPanel.active;
  const activeBranch =
    selection?.kind === "branch" ? findBranch(categories, selection.branchId) : null;
  const activeSpaceId = activeBranch?.spaceId ?? null;

  useEffect(() => {
    if (activeSpaceId !== null) dispatchSpaceFocus({ type: "select", spaceId: activeSpaceId });
  }, [activeSpaceId, dispatchSpaceFocus]);

  return {
    panelMode,
    activeBranch,
    activeBranchId: selection?.kind === "branch" ? selection.branchId : null,
    allTasksOpen: selection?.kind === "allTasks",
    // null when the selected task was deleted, so the panel renders nothing.
    activeTask:
      selection?.kind === "task" ? (tasks.find((t) => t.id === selection.taskId) ?? null) : null,
    // null when the selected event was deleted, so the panel renders nothing.
    activeEvent:
      selection?.kind === "event" ? (events.find((e) => e.id === selection.eventId) ?? null) : null,
    /** Where Back leads, when the open item came from an overview. */
    backTarget: selection?.kind === "task" || selection?.kind === "event" ? selection.from : null,
    navigationPending: branchPanel.pending !== null,
    panelTasks: activeBranch ? resolveBranchTasks(activeBranch, tasks) : [],
    // The Space focus follows through the activeSpaceId effect once the Branch
    // actually opens, so a navigation held by unsaved edits changes nothing yet.
    openBranch: (branch: Branch) =>
      dispatch({ type: "openBranch", branchId: branch.id, spaceId: branch.spaceId }),
    openAllTasks: () => dispatch({ type: "openAllTasks" }),
    openTask: (task: CalendarTask) => dispatch({ type: "openTask", taskId: task.id }),
    openEvent: (event: CalendarEvent) => dispatch({ type: "openEvent", eventId: event.id }),
    back: () => dispatch({ type: "back" }),
    setEditorDirty: (dirty: boolean) => dispatch({ type: "setDirty", dirty }),
    proceedNavigation: () => dispatch({ type: "proceed" }),
    cancelNavigation: () => dispatch({ type: "stay" }),
    close: () => dispatch({ type: "close" }),
    selectSpace: (spaceId: string | null) => {
      dispatchSpaceFocus({ type: "select", spaceId });
      dispatch({ type: "spaceChanged", spaceId });
    },
  };
}
