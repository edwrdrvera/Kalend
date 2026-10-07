import { useEffect, useReducer, useState, type Dispatch } from "react";
import { resolveSubject, subjectTasks } from "@/lib/panel-subject";
import { upcomingEventsByDay, weekLoad } from "@/lib/space-overview";
import { panelReducer, loadPanelState, savePanelState } from "@/lib/panel-state";
import type { CalendarCategory, CalendarEvent, CalendarGroup, CalendarTask } from "@/lib/calendar-types";
import type { SpaceFocusAction } from "@/lib/space-focus";

type PanelMode = "pinned" | "sheet" | "fullscreen";

export function useSpacePanel(
  categories: CalendarCategory[],
  groups: CalendarGroup[],
  tasks: CalendarTask[],
  events: CalendarEvent[],
  dispatchSpaceFocus: Dispatch<SpaceFocusAction>
) {
  // Read storage in the initializer, not a mount effect: StrictMode's second
  // effect run would restore what the first save had already overwritten.
  const [panel, dispatch] = useReducer(panelReducer, undefined, loadPanelState);
  const [panelMode, setPanelMode] = useState<PanelMode>("pinned");

  useEffect(() => {
    savePanelState(panel);
  }, [panel]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPanelMode(w >= 1200 ? "pinned" : w >= 900 ? "sheet" : "fullscreen");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const selection = panel.active;
  const subject =
    selection?.kind === "space" || selection?.kind === "group"
      ? resolveSubject(selection, categories, groups)
      : null;
  const activeSpaceId = subject?.spaceId ?? null;

  useEffect(() => {
    if (activeSpaceId !== null) dispatchSpaceFocus({ type: "select", spaceId: activeSpaceId });
  }, [activeSpaceId, dispatchSpaceFocus]);

  const activeTask =
    selection?.kind === "task" ? (tasks.find((t) => t.id === selection.taskId) ?? null) : null;
  const activeEvent =
    selection?.kind === "event" ? (events.find((e) => e.id === selection.eventId) ?? null) : null;
  const openItemGone =
    (selection?.kind === "task" && activeTask === null) ||
    (selection?.kind === "event" && activeEvent === null);

  useEffect(() => {
    if (openItemGone) dispatch({ type: "itemGone" });
  }, [openItemGone, panel.dirty, panel.pending]);

  return {
    panelMode,
    subject,
    allTasksOpen: selection?.kind === "allTasks",
    // null when the selected task or event was deleted, so the panel renders nothing.
    activeTask,
    activeEvent,
    /** Where Back leads, when the open item came from an overview. */
    backTarget: selection?.kind === "task" || selection?.kind === "event" ? selection.from : null,
    navigationPending: panel.pending !== null,
    panelTasks: subject ? subjectTasks(subject, tasks) : [],
    panelUpcoming: subject ? upcomingEventsByDay(events, subject, new Date()) : [],
    panelWeekLoad: subject ? weekLoad(events, subject, new Date()) : [],
    // The Space focus follows through the activeSpaceId effect once the panel
    // actually opens, so a navigation held by unsaved edits changes nothing yet.
    openSpace: (spaceId: string) => dispatch({ type: "openSpace", spaceId }),
    openGroup: (group: CalendarGroup) =>
      dispatch({ type: "openGroup", groupId: group.id, spaceId: group.category_id }),
    openAllTasks: () => dispatch({ type: "openAllTasks" }),
    openTask: (task: CalendarTask) => dispatch({ type: "openTask", taskId: task.id }),
    openEvent: (event: CalendarEvent) => dispatch({ type: "openEvent", eventId: event.id }),
    back: () => dispatch({ type: "back" }),
    groupDeleted: (groupId: string) => dispatch({ type: "groupGone", groupId }),
    setEditorDirty: (dirty: boolean) => dispatch({ type: "setDirty", dirty }),
    proceedNavigation: () => dispatch({ type: "proceed" }),
    cancelNavigation: () => dispatch({ type: "stay" }),
    close: () => dispatch({ type: "close" }),
    selectSpace: (spaceId: string | null) => {
      dispatchSpaceFocus({ type: "select", spaceId });
      dispatch({ type: "spaceChanged", spaceId });
      // The rail opens what it picks: a Space's panel, or the All tasks view for "all spaces".
      dispatch(spaceId !== null ? { type: "openSpace", spaceId } : { type: "openAllTasks" });
    },
  };
}
