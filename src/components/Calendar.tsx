"use client";

import { useState, useRef, useReducer, useSyncExternalStore } from "react";
import { startOfMonth, setHours, isSameDay } from "date-fns";
import { CalendarPlus, ListTodo, Trash2 } from "lucide-react";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventCreatePopover from "./EventCreatePopover";
import SpacePanel from "./SpacePanel";
import SettingsMenu from "./SettingsMenu";
import SpaceEditorDialog, { type SpaceEditorTarget } from "./SpaceEditorDialog";
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
import type { CalendarEvent } from "@/lib/calendar-types";
import { branchesForSpaces } from "@/lib/branch-stub";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { useEventEditor } from "@/hooks/useEventEditor";
import { useEventSelection } from "@/hooks/useEventSelection";
import { useSpacePanel } from "@/hooks/useSpacePanel";
import { filterBySpace, initialSpaceFocus, spaceFocusReducer } from "@/lib/space-focus";

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
  const categories = useCategories(
    (detachedEvents, detachedTasks, categoryId) => {
      events.reconcileSpaceRemoval(detachedEvents, categoryId);
      tasks.reconcileSpaceRemoval(detachedTasks, categoryId);
      dispatchSpaceFocus({ type: "deleted", spaceId: categoryId });
    }
  );
  const panel = useSpacePanel(categories.data, tasks.data, dispatchSpaceFocus);

  const handleRetry = () => {
    events.retry();
    tasks.retry();
    categories.retry();
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

  const handleEventClick = (event: CalendarEvent, anchorRect: DOMRect) => {
    selection.clear();
    editor.openEdit(event, anchorRect);
  };

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
          label: ids.length > 1 ? `Delete ${ids.length} events` : "Delete event",
          destructive: true,
          icon: <Trash2 className="size-3.5" />,
          onSelect: () => selection.requestDelete(ids),
        },
      ],
    });
  };

  if (!mounted) return null;

  const visibleEvents = filterBySpace(events.data, spaceFocus);
  const visibleTasks = filterBySpace(tasks.data, spaceFocus);

  // All branches, for the agenda list.
  const branches = branchesForSpaces(categories.data);
  const { activeBranch } = panel;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-card text-foreground">
        {(events.error || tasks.error || categories.error) && (
          <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            {events.error && <ErrorToast message={events.error} onDismiss={() => events.setError(null)} onRetry={handleRetry} />}
            {tasks.error && <ErrorToast message={tasks.error} onDismiss={() => tasks.setError(null)} onRetry={handleRetry} />}
            {categories.error && <ErrorToast message={categories.error} onDismiss={() => categories.setError(null)} onRetry={handleRetry} />}
          </div>
        )}
        <CalendarSidebar
          currentDate={selectedDate}
          viewDate={viewDate}
          onDateSelect={handleDateSelect}
          tasks={visibleTasks}
          events={visibleEvents}
          tasksLoading={tasks.loading}
          eventsLoading={events.loading}
          onCreateTask={tasks.createTask}
          onToggleTaskComplete={tasks.toggleComplete}
          onDeleteTask={tasks.deleteTask}
          onEventClick={handleEventClick}
          categories={categories.data}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={panel.selectSpace}
          onCreateSpace={() => setSpaceEditor({ mode: "create" })}
          onEditSpace={(category) => setSpaceEditor({ mode: "edit", category })}
          branches={branches}
          activeBranchId={panel.activeBranchId}
          onOpenBranch={panel.openBranch}
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
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onCreateEventRange={editor.openCreateRange}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={editor.openCreate}
                onCreateEventRange={editor.openCreateRange}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
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
              activeBranch ? "w-[330px]" : "w-0"
            )}
          >
            <div className="h-full w-[330px]">
              {activeBranch && (
                <SpacePanel
                  branch={activeBranch}
                  tasks={panel.panelTasks}
                  modal={false}
                  onClose={panel.close}
                  onToggleComplete={tasks.toggleComplete}
                  onCreateTask={(title) => tasks.createTask(title, undefined, activeBranch.spaceId)}
                  onOpenSettings={() => handleEditSpaceById(activeBranch.spaceId)}
                />
              )}
            </div>
          </div>
        ) : (
          activeBranch && (
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
                <SpacePanel
                  branch={activeBranch}
                  tasks={panel.panelTasks}
                  modal
                  onClose={panel.close}
                  onToggleComplete={tasks.toggleComplete}
                  onCreateTask={(title) => tasks.createTask(title, undefined, activeBranch.spaceId)}
                  onOpenSettings={() => handleEditSpaceById(activeBranch.spaceId)}
                />
              </div>
            </>
          )
        )}
      {editor.target && (
        <EventCreatePopover
          key={editor.key}
          anchorRect={editor.target.rect}
          side={editor.target.side}
          event={editor.target.event}
          initialStart={editor.target.start}
          initialEnd={editor.target.end ?? undefined}
          initialSpaceId={editor.target.initialSpaceId}
          categories={categories.data}
          breadcrumb={(() => {
            const spaceId = editor.target.event?.category_id;
            if (!spaceId) return null;
            const branch = branches.find((b) => b.spaceId === spaceId);
            if (!branch) return null;
            const label =
              branch.name === branch.spaceName
                ? branch.spaceName
                : `${branch.spaceName} › ${branch.name}`;
            return {
              label,
              onOpen: () => {
                panel.openBranch(branch);
                editor.dismiss();
              },
            };
          })()}
          onSubmit={editor.submit}
          onDelete={editor.target.event ? editor.remove : undefined}
          onClose={editor.close}
          submitting={editor.submitting}
          error={editor.error}
        />
      )}

      <SpaceEditorDialog
        target={spaceEditor}
        onOpenChange={(open) => {
          if (!open) setSpaceEditor(null);
        }}
        onCreate={categories.createCategory}
        onUpdate={categories.updateCategory}
        onDelete={categories.deleteCategory}
      />

      <TaskCreateDialog
        day={taskCreateDay}
        categories={categories.data}
        initialSpaceId={selectedSpaceId}
        onCreate={tasks.createTask}
        onOpenChange={(open) => {
          if (!open) setTaskCreateDay(null);
        }}
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
