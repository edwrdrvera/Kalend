"use client";

import { useState, useRef, useReducer, useSyncExternalStore } from "react";
import { addHours, startOfHour, startOfMonth, setHours, isSameDay } from "date-fns";
import { CalendarPlus, ListTodo, PanelRight, Trash2 } from "lucide-react";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventCreatePopover from "./EventCreatePopover";
import SpacePanel from "./SpacePanel";
import AllTasksPanel from "./AllTasksPanel";
import TaskInspector from "./TaskInspector";
import EventInspector from "./EventInspector";
import SettingsMenu from "./SettingsMenu";
import SpaceEditorDialog, { type SpaceEditorTarget } from "./SpaceEditorDialog";
import GroupEditorDialog, { type GroupEditorTarget } from "./GroupEditorDialog";
import TaskCreateDialog from "./TaskCreateDialog";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CalendarView } from "./ViewSwitcher";
import type { AlertOffset } from "@/lib/alerts";
import type { CalendarEvent, CalendarGroup, CalendarTask, TaskPatchRequest } from "@/lib/calendar-types";
import type { EventFormValues } from "@/lib/event-form";
import type { InspectorNav } from "./InspectorParts";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useEventEditor } from "@/hooks/useEventEditor";
import { useEventSelection } from "@/hooks/useEventSelection";
import { useSpacePanel } from "@/hooks/useSpacePanel";
import { useAlertDelivery } from "@/hooks/useAlertDelivery";
import { useAlertTray } from "@/hooks/useAlertTray";
import { useAlerts } from "@/hooks/useAlerts";
import { useAlertItemOpener } from "@/hooks/useAlertItemOpener";
import AlertMessages from "./AlertMessages";
import { initialSpaceFocus, isEmphasized, spaceFocusReducer } from "@/lib/space-focus";
import { membershipForSubject } from "@/lib/panel-subject";

function ErrorToast({
  message,
  onDismiss,
  onRetry,
}: {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground shadow-lg ring-1 ring-border">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium text-primary transition-colors hover:text-primary/80"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
    </div>
  );
}

const noopSubscribe = () => () => {};

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  // False during server render and hydration, true once on the client.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [spaceFocus, dispatchSpaceFocus] = useReducer(spaceFocusReducer, initialSpaceFocus);
  const { selectedSpaceId } = spaceFocus;

  // Space create/edit dialog: null when closed, else the open target.
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditorTarget | null>(null);
  // Group create/rename/delete dialog: null when closed.
  const [groupEditor, setGroupEditor] = useState<GroupEditorTarget | null>(null);
  // Right-click context menu (day/slot/event), and quick task creation.
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [taskCreateDay, setTaskCreateDay] = useState<Date | null>(null);
  const events = useCalendarEvents(viewDate);
  const tasks = useTasks();
  const selection = useEventSelection(events);
  const groups = useGroups((_releasedEvents, _releasedTasks, groupId) => {
    events.reconcileGroupRemoval(groupId);
    tasks.reconcileGroupRemoval(groupId);
  });
  const categories = useCategories(
    (detachedEvents, detachedTasks, categoryId) => {
      events.reconcileSpaceRemoval(detachedEvents, categoryId);
      tasks.reconcileSpaceRemoval(detachedTasks, categoryId);
      groups.reconcileSpaceRemoval(categoryId);
      dispatchSpaceFocus({ type: "deleted", spaceId: categoryId });
    }
  );
  const panel = useSpacePanel(categories.data, groups.data, tasks.data, events.data, dispatchSpaceFocus);

  const handleRetry = () => {
    events.retry();
    tasks.retry();
    categories.retry();
    groups.retry();
  };

  // Selecting a day (from the mini calendar, or any of the main grids) also
  // moves the shared view to that day, so both stay in sync no matter which
  // one triggered the change. In month view that means jumping to that
  // day's month; in week/day view, viewDate becomes the day itself, since
  // WeekGrid/DayGrid derive the days they show from it directly, jumping to
  // that day's month would skip past the week or day actually clicked.
  const handleDateSelect = (date: Date) => {
    // Re-clicking the already-selected day is a no-op: only touch state that
    // actually changes. Setting selectedDate/viewDate to a fresh object for
    // the same day would re-render the agenda and, worse, refetch events
    // (useCalendarEvents keys its fetch on viewDate identity) for nothing.
    const nextViewDate = view === "month" ? startOfMonth(date) : date;
    if (!isSameDay(date, selectedDate)) setSelectedDate(date);
    if (!isSameDay(nextViewDate, viewDate)) setViewDate(nextViewDate);
  };

  // Ref on the calendar content area — used to get the container rect for
  // popover side computation.
  const calendarContentRef = useRef<HTMLDivElement>(null);

  const editor = useEventEditor(events, selectedSpaceId, calendarContentRef);

  const handleEventClick = (event: CalendarEvent) => {
    selection.clear();
    editor.close();
    panel.openEvent(event);
  };

  // A reminder opens its event or task in the panel. An item that isn't loaded
  // (just created in another tab) has nothing to open yet.
  const alerts = useAlertTray();
  const openAlertItem = useAlertItemOpener({
    events,
    tasks,
    openEvent: handleEventClick,
    openTask: panel.openTask,
    onMissing: alerts.notify,
  });
  useAlertDelivery(alerts.dispatch, openAlertItem);
  const itemAlerts = useAlerts(alerts.notify);

  // Open the Space editor in edit mode for a given Space id (used by the panel
  // overflow/footer and the rail context menu). No-op if the Space is gone.
  const handleEditSpaceById = (spaceId: string) => {
    const category = categories.data.find((c) => c.id === spaceId);
    if (category) setSpaceEditor({ mode: "edit", category });
  };

  // ── Right-click menus + event multi-select (Phase 2) ────────────────
  const cursorRect = (x: number, y: number): DOMRect => new DOMRect(x, y, 1, 1);

  const calendarMenuItems = (day: Date, createEvent: () => void): ContextMenuItem[] => [
    {
      label: "Create event",
      icon: <CalendarPlus className="size-3.5 text-muted-foreground" />,
      onSelect: () => {
        handleDateSelect(day);
        createEvent();
      },
    },
    {
      label: "Create task",
      icon: <ListTodo className="size-3.5 text-muted-foreground" />,
      onSelect: () => {
        handleDateSelect(day);
        setTaskCreateDay(day);
      },
    },
  ];

  const handleDayContextMenu = (day: Date, x: number, y: number) =>
    setContextMenu({
      x,
      y,
      items: calendarMenuItems(day, () => editor.openCreate(day, cursorRect(x, y))),
    });

  const handleSlotContextMenu = (day: Date, hour: number, x: number, y: number) =>
    setContextMenu({
      x,
      y,
      items: calendarMenuItems(day, () =>
        editor.openCreate(setHours(day, hour), cursorRect(x, y))
      ),
    });

  const handleEventContextMenu = (event: CalendarEvent, x: number, y: number) => {
    const ids = selection.idsForContextMenu(event);
    setContextMenu({
      x,
      y,
      items: [
        {
          label: "Open details",
          icon: <PanelRight className="size-3.5" />,
          onSelect: () => handleEventClick(event),
        },
        {
          label: ids.length > 1 ? `Delete ${ids.length} events` : "Delete event",
          destructive: true,
          icon: <Trash2 className="size-3.5" />,
          onSelect: () => selection.requestDelete(ids),
        },
      ],
    });
  };

  if (!mounted) return null;

  // The sidebar agenda stays scoped to the selected Space. The grids get every
  // item and dim the ones outside it.
  const agendaEvents = events.data.filter((event) => isEmphasized(event, spaceFocus));
  const agendaTasks = tasks.data.filter((task) => isEmphasized(task, spaceFocus));

  const { subject, activeTask, activeEvent } = panel;
  const rightPanelOpen =
    subject !== null || panel.allTasksOpen || activeTask !== null || activeEvent !== null;

  const openGroupEditor = (group: CalendarGroup) => {
    const space = categories.data.find((c) => c.id === group.category_id);
    if (!space) return;
    setGroupEditor({
      mode: "edit",
      group,
      spaceName: space.name,
      eventCount: events.data.filter((e) => e.group_id === group.id).length,
      taskCount: tasks.data.filter((t) => t.group_id === group.id).length,
    });
  };
  // The panel closes only after the server confirmed the delete.
  const handleDeleteGroup = async (group: CalendarGroup) => {
    await groups.deleteGroup(group);
    panel.groupDeleted(group.id);
  };
  const openGroupCreator = (spaceId: string) => {
    const space = categories.data.find((c) => c.id === spaceId);
    if (space) setGroupEditor({ mode: "create", spaceId, spaceName: space.name });
  };

  // Close only after the server confirms, so a failed delete brings the task
  // back with its details still open.
  const handleDeleteTask = async (task: CalendarTask) => {
    if (!(await tasks.deleteTask(task))) return;
    panel.setEditorDirty(false);
    panel.close();
  };

  // The item saves first: the server works out when the alert fires from the
  // saved time. A false result keeps the draft so the user can retry.
  const handleSaveEvent = async (
    event: CalendarEvent,
    values: EventFormValues | null,
    alertOffset: AlertOffset | null
  ) => {
    try {
      if (values) await events.updateEvent(event.id, values);
      await itemAlerts.syncAlert({ kind: "event", id: event.id }, alertOffset);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveTask = async (
    task: CalendarTask,
    patch: TaskPatchRequest,
    alertOffset: AlertOffset | null
  ) => {
    if (Object.keys(patch).length > 0 && !(await tasks.updateTask(task, patch))) return false;
    try {
      await itemAlerts.syncAlert({ kind: "task", id: task.id }, alertOffset);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveSpaceDescription = async (description: string | null) => {
    const space = categories.data.find((c) => c.id === subject?.spaceId);
    return space ? categories.updateCategory(space, { description }) : false;
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!(await events.deleteEvent(event))) return;
    panel.setEditorDirty(false);
    panel.close();
  };

  const inspectorNav = (categoryId: string | null, groupId: string | null): InspectorNav => {
    const category = categories.data.find((c) => c.id === categoryId);
    const group = groups.data.find((g) => g.id === groupId);
    const { backTarget } = panel;
    const backLabel =
      backTarget?.kind === "allTasks"
        ? "All tasks"
        : backTarget?.kind === "space"
          ? (categories.data.find((c) => c.id === backTarget.spaceId)?.name ?? null)
          : backTarget?.kind === "group"
            ? (groups.data.find((g) => g.id === backTarget.groupId)?.name ?? null)
            : null;
    return {
      space: category ? { name: category.name, onOpen: () => panel.openSpace(category.id) } : null,
      group: group ? { name: group.name, onOpen: () => panel.openGroup(group) } : null,
      back: backLabel ? { label: backLabel, onBack: panel.back } : null,
    };
  };

  const renderRightPanel = (modal: boolean) => {
    if (subject) {
      return (
        <SpacePanel
          subject={subject}
          tasks={panel.panelTasks}
          upcoming={panel.panelUpcoming}
          modal={modal}
          onClose={panel.close}
          onToggleComplete={tasks.toggleComplete}
          onOpenTask={panel.openTask}
          onOpenEvent={panel.openEvent}
          onCreateEvent={(anchor) =>
            editor.openCreate(startOfHour(addHours(new Date(), 1)), anchor, membershipForSubject(subject))
          }
          onCreateTask={(title) => tasks.createTask(title, undefined, membershipForSubject(subject))}
          onOpenSettings={() => {
            if (subject.kind === "space") handleEditSpaceById(subject.spaceId);
            else {
              const group = groups.data.find((g) => g.id === subject.groupId);
              if (group) openGroupEditor(group);
            }
          }}
          onSaveDescription={handleSaveSpaceDescription}
          onDirtyChange={panel.setEditorDirty}
          navigationPending={panel.navigationPending}
          onProceed={panel.proceedNavigation}
          onStay={panel.cancelNavigation}
        />
      );
    }
    if (panel.allTasksOpen) {
      return (
        <AllTasksPanel
          tasks={tasks.data}
          categories={categories.data}
          groups={groups.data}
          selectedSpaceId={selectedSpaceId}
          modal={modal}
          onClose={panel.close}
          onCreateTask={tasks.createTask}
          onToggleTaskComplete={tasks.toggleComplete}
          onOpenTask={panel.openTask}
        />
      );
    }
    if (activeTask) {
      return (
        <TaskInspector
          key={activeTask.id}
          task={activeTask}
          alertOffset={itemAlerts.byItem.get(activeTask.id)?.offset_minutes ?? null}
          categories={categories.data}
          groups={groups.data}
          modal={modal}
          nav={inspectorNav(activeTask.category_id, activeTask.group_id)}
          onClose={panel.close}
          onSave={handleSaveTask}
          onToggleComplete={tasks.toggleComplete}
          onDelete={handleDeleteTask}
          onDirtyChange={panel.setEditorDirty}
          navigationPending={panel.navigationPending}
          onProceed={panel.proceedNavigation}
          onStay={panel.cancelNavigation}
        />
      );
    }
    if (activeEvent) {
      return (
        <EventInspector
          key={activeEvent.id}
          event={activeEvent}
          alertOffset={itemAlerts.byItem.get(activeEvent.id)?.offset_minutes ?? null}
          categories={categories.data}
          groups={groups.data}
          modal={modal}
          nav={inspectorNav(activeEvent.category_id, activeEvent.group_id)}
          onClose={panel.close}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onDirtyChange={panel.setEditorDirty}
          navigationPending={panel.navigationPending}
          onProceed={panel.proceedNavigation}
          onStay={panel.cancelNavigation}
        />
      );
    }
    return null;
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-card text-foreground">
        {(events.error || tasks.error || categories.error || groups.error) && (
          <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {events.error && <ErrorToast message={events.error} onDismiss={() => events.setError(null)} onRetry={handleRetry} />}
            {tasks.error && <ErrorToast message={tasks.error} onDismiss={() => tasks.setError(null)} onRetry={handleRetry} />}
            {categories.error && <ErrorToast message={categories.error} onDismiss={() => categories.setError(null)} onRetry={handleRetry} />}
            {groups.error && <ErrorToast message={groups.error} onDismiss={() => groups.setError(null)} onRetry={handleRetry} />}
          </div>
        )}
        <CalendarSidebar
          currentDate={selectedDate}
          viewDate={viewDate}
          onDateSelect={handleDateSelect}
          tasks={agendaTasks}
          events={agendaEvents}
          tasksLoading={tasks.loading}
          eventsLoading={events.loading}
          alertsByItem={itemAlerts.byItem}
          onToggleTaskComplete={tasks.toggleComplete}
          onOpenTask={panel.openTask}
          onOpenAllTasks={panel.openAllTasks}
          onEventClick={handleEventClick}
          categories={categories.data}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={panel.selectSpace}
          onCreateSpace={() => setSpaceEditor({ mode: "create" })}
          onEditSpace={(category) => setSpaceEditor({ mode: "edit", category })}
          groups={groups.data}
          activeSubject={subject}
          onOpenSpace={panel.openSpace}
          onOpenGroup={panel.openGroup}
          onCreateGroup={openGroupCreator}
          onEditGroup={openGroupEditor}
          accountMenu={
            <SettingsMenu
              triggerLabel="Account"
              side="right"
              align="end"
              triggerClassName="grid size-[30px] place-items-center rounded-full bg-muted text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              triggerChildren="E"
            />
          }
          mobileAccountMenu={
            <SettingsMenu
              triggerLabel="Account"
              side="bottom"
              align="end"
              triggerClassName="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/70"
              triggerChildren="E"
            />
          }
        />
        {events.initialLoading ? (
          <div className="flex-1 bg-background">
            <LoadingSpinner />
          </div>
        ) : (
          <div
            ref={calendarContentRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background p-2 md:p-3"
          >
            {/* The grid floats as a rounded card on the warm page background,
                echoing the landing mock's floating calendar look instead of a
                flat edge-to-edge white panel. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_6px_22px_-12px_rgba(28,26,22,0.28)]">
            {view === "month" && (
              <MonthGrid
                selectedDate={selectedDate}
                viewDate={viewDate}
                events={events.data}
                tasks={tasks.data}
                categories={categories.data}
                spaceFocus={spaceFocus}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onEventClick={handleEventClick}
                onDayContextMenu={handleDayContextMenu}
                onEventShiftClick={selection.toggle}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selection.selectedEventIds}
                view={view}
                onViewChange={setView}
              />
            )}
            {view === "week" && (
              <WeekGrid
                selectedDate={selectedDate}
                viewDate={viewDate}
                events={events.data}
                tasks={tasks.data}
                categories={categories.data}
                spaceFocus={spaceFocus}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onCreateEventRange={editor.openCreateRange}
                onEventClick={handleEventClick}
                onTaskOpen={panel.openTask}
                onTaskToggle={tasks.toggleComplete}
                onSlotContextMenu={handleSlotContextMenu}
                onEventShiftClick={selection.toggle}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selection.selectedEventIds}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
                pendingRange={editor.pendingRange}
                view={view}
                onViewChange={setView}
              />
            )}
            {view === "day" && (
              <DayGrid
                viewDate={viewDate}
                selectedDate={selectedDate}
                events={events.data}
                tasks={tasks.data}
                categories={categories.data}
                spaceFocus={spaceFocus}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onCreateEventRange={editor.openCreateRange}
                onEventClick={handleEventClick}
                onTaskOpen={panel.openTask}
                onTaskToggle={tasks.toggleComplete}
                onSlotContextMenu={handleSlotContextMenu}
                onEventShiftClick={selection.toggle}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selection.selectedEventIds}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
                pendingRange={editor.pendingRange}
                view={view}
                onViewChange={setView}
              />
            )}
            </div>
          </div>
        )}

        {/* Space Panel (fourth region). Pinned: an in-flow column whose width
            animates 0<->330 so the canvas reflows in the same transition.
            Below 1200px: an overlay sheet with a scrim; below 900px: full
            screen. Both overlay modes are modal dialogs (see SpacePanel). */}
        {panel.panelMode === "pinned" ? (
          <div
            className={cn(
              "relative h-full shrink-0 overflow-hidden transition-[width] duration-[180ms] ease-out motion-reduce:transition-none",
              rightPanelOpen ? "w-[330px]" : "w-0"
            )}
          >
            <div className="h-full w-[330px]">{renderRightPanel(false)}</div>
          </div>
        ) : (
          rightPanelOpen && (
            <>
              <button
                type="button"
                aria-label="Close panel"
                onClick={panel.close}
                className="absolute inset-0 z-40 bg-foreground/20 motion-safe:animate-[fadeIn_180ms_ease-out]"
              />
              <div
                className={cn(
                  "absolute inset-y-0 right-0 z-50 motion-safe:animate-[fadeIn_180ms_ease-out]",
                  panel.panelMode === "fullscreen" ? "inset-x-0 w-full" : "w-[330px]"
                )}
              >
                {renderRightPanel(true)}
              </div>
            </>
          )
        )}
      {editor.target && (
        <EventCreatePopover
          key={editor.key}
          anchorRect={editor.target.rect}
          side={editor.target.side}
          initialStart={editor.target.start}
          initialEnd={editor.target.end ?? undefined}
          initialSpaceId={editor.target.initialSpaceId}
          initialGroupId={editor.target.initialGroupId}
          categories={categories.data}
          groups={groups.data}
          onSubmit={editor.submit}
          onClose={editor.close}
          submitting={editor.submitting}
          error={editor.error}
        />
      )}

      <SpaceEditorDialog
        target={spaceEditor}
        groups={groups.data}
        onOpenChange={(open) => {
          if (!open) setSpaceEditor(null);
        }}
        onCreate={categories.createCategory}
        onUpdate={categories.updateCategory}
        onDelete={categories.deleteCategory}
      />

      <GroupEditorDialog
        target={groupEditor}
        onOpenChange={(open) => {
          if (!open) setGroupEditor(null);
        }}
        onCreate={groups.createGroup}
        onRename={groups.renameGroup}
        onDelete={handleDeleteGroup}
      />

      <TaskCreateDialog
        day={taskCreateDay}
        categories={categories.data}
        groups={groups.data}
        initialSpaceId={selectedSpaceId}
        onCreate={tasks.createTask}
        onOpenChange={(open) => {
          if (!open) setTaskCreateDay(null);
        }}
      />

      <AlertMessages
        tray={alerts.tray}
        onOpen={openAlertItem}
        onDismiss={alerts.dismiss}
        onClearMissed={alerts.clearMissed}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {selection.pendingEventDeletion && (
        <Dialog open onOpenChange={selection.cancelDelete}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>
                {selection.pendingEventDeletion.length > 1
                  ? `Delete ${selection.pendingEventDeletion.length} events?`
                  : "Delete this event?"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">This can&apos;t be undone.</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={selection.cancelDelete}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={selection.confirmDelete}>
                <Trash2 />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
