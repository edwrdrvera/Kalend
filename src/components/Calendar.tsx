"use client";

import { useState, useEffect, useRef, useReducer } from "react";
import { startOfMonth, setHours } from "date-fns";
import { CalendarPlus, ListTodo, Trash2 } from "lucide-react";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import EventCreatePopover, { type EventFormValues } from "./EventCreatePopover";
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
import { computePopoverSide } from "@/lib/popover-position";
import { cn } from "@/lib/utils";
import type { CalendarView } from "./ViewSwitcher";
import type { CalendarEvent } from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";
import { resolveBranchTasks } from "@/lib/branch-types";
import { branchesForSpaces, findBranch } from "@/lib/branch-stub";
import {
  branchPanelReducer,
  initialBranchPanelState,
  loadBranchPanelState,
  saveBranchPanelState,
} from "@/lib/branch-panel-state";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";
import { filterBySpace, initialSpaceFocus, spaceFocusReducer } from "@/lib/space-focus";

type PanelMode = "pinned" | "sheet" | "fullscreen";

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

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "day" : "week"
  );
  const [mounted, setMounted] = useState(false);
  const [spaceFocus, dispatchSpaceFocus] = useReducer(spaceFocusReducer, initialSpaceFocus);
  const { selectedSpaceId } = spaceFocus;

  // Space Panel: which branch is open, remembered per Space + globally (see
  // branch-panel-state.ts). Bound to a branch, not the date.
  const [branchPanel, dispatchBranchPanel] = useReducer(
    branchPanelReducer,
    initialBranchPanelState
  );
  const [panelMode, setPanelMode] = useState<PanelMode>("pinned");

  // Space create/edit dialog: null when closed, else the open target.
  const [spaceEditor, setSpaceEditor] = useState<SpaceEditorTarget | null>(null);
  // Right-click context menu (day/slot/event), and quick task creation.
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [taskCreateDay, setTaskCreateDay] = useState<Date | null>(null);
  // Events selected via shift+click, for a right-click bulk delete.
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  // Ids queued for deletion, pending the custom confirm dialog.
  const [pendingEventDeletion, setPendingEventDeletion] = useState<string[] | null>(null);

  const events = useCalendarEvents(viewDate);
  const tasks = useTasks();
  const categories = useCategories(
    (detachedEvents, detachedTasks, categoryId) => {
      events.reconcileSpaceRemoval(detachedEvents, categoryId);
      tasks.reconcileSpaceRemoval(detachedTasks, categoryId);
      dispatchSpaceFocus({ type: "deleted", spaceId: categoryId });
    }
  );

  useEffect(() => {
    setMounted(true);
    // Restore remembered open/closed + last-branch-per-Space (never throws).
    dispatchBranchPanel({ type: "hydrate", state: loadBranchPanelState() });
  }, []);

  // Persist panel preferences whenever they change.
  useEffect(() => {
    saveBranchPanelState(branchPanel);
  }, [branchPanel]);

  // Track the responsive mode: pinned (>=1200) narrows the canvas; below that
  // the panel is an overlay sheet (>=900) or a full-screen sheet (<900).
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setPanelMode(w >= 1200 ? "pinned" : w >= 900 ? "sheet" : "fullscreen");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

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
    setSelectedDate(date);
    setViewDate(view === "month" ? startOfMonth(date) : date);
  };

  // Ref on the calendar content area — used to get the container rect for
  // popover side computation.
  const calendarContentRef = useRef<HTMLDivElement>(null);

  // The event editor is anchored to whichever calendar element opened it.
  const [eventPopover, setEventPopover] = useState<{
    rect: DOMRect;
    side: "left" | "right";
    event: CalendarEvent | null;
    start: Date;
    end: Date | null;
    initialSpaceId: string | null;
  } | null>(null);
  const [popoverSubmitting, setPopoverSubmitting] = useState(false);
  const [popoverError, setPopoverError] = useState<string | null>(null);
  const [popoverKey, setPopoverKey] = useState(0);

  const getPopoverSide = (anchorRect: DOMRect) => {
    const containerRect = calendarContentRef.current?.getBoundingClientRect();
    return containerRect ? computePopoverSide(anchorRect, containerRect) : "right";
  };

  const handleCreateEvent = (day: Date, anchorRect: DOMRect) => {
    setEventPopover({
      rect: anchorRect,
      side: getPopoverSide(anchorRect),
      event: null,
      start: day,
      end: null,
      initialSpaceId: selectedSpaceId,
    });
    setPopoverError(null);
    setPopoverKey((key) => key + 1);
  };

  // Drag-to-create on the time grid: opens the creator prefilled with the
  // dragged start/end range.
  const handleCreateEventRange = (start: Date, end: Date, anchorRect: DOMRect) => {
    setEventPopover({
      rect: anchorRect,
      side: getPopoverSide(anchorRect),
      event: null,
      start,
      end,
      initialSpaceId: selectedSpaceId,
    });
    setPopoverError(null);
    setPopoverKey((key) => key + 1);
  };

  const handleEventClick = (event: CalendarEvent, anchorRect: DOMRect) => {
    setSelectedEventIds(new Set());
    setEventPopover({
      rect: anchorRect,
      side: getPopoverSide(anchorRect),
      event,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      initialSpaceId: event.category_id,
    });
    setPopoverError(null);
    setPopoverKey((key) => key + 1);
  };

  const handlePopoverSubmit = async (values: EventFormValues) => {
    if (!eventPopover) return;

    setPopoverSubmitting(true);
    setPopoverError(null);
    try {
      if (eventPopover.event) {
        await events.updateEvent(eventPopover.event.id, values);
      } else {
        await events.createEvent(values);
      }
      setEventPopover(null);
    } catch (err) {
      setPopoverError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPopoverSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventPopover?.event) return;
    const event = eventPopover.event;
    setEventPopover(null);
    await events.deleteEvent(event);
  };

  // Opening a branch focuses its Space and slides the panel in (one action,
  // per the brief's rail-flyout and breadcrumb entry points).
  const handleOpenBranch = (branch: Branch) => {
    dispatchSpaceFocus({ type: "select", spaceId: branch.spaceId });
    dispatchBranchPanel({
      type: "openBranch",
      branchId: branch.id,
      spaceId: branch.spaceId,
    });
  };

  const handleClosePanel = () => dispatchBranchPanel({ type: "close" });

  // Changing the active Space in the rail closes the panel (FR7): the open
  // branch no longer applies.
  const handleSelectSpace = (spaceId: string | null) => {
    dispatchSpaceFocus({ type: "select", spaceId });
    dispatchBranchPanel({ type: "spaceChanged", spaceId });
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
      items: calendarMenuItems(day, () => handleCreateEvent(day, cursorRect(x, y))),
    });

  const handleSlotContextMenu = (day: Date, hour: number, x: number, y: number) =>
    setContextMenu({
      x,
      y,
      items: calendarMenuItems(day, () =>
        handleCreateEvent(setHours(day, hour), cursorRect(x, y))
      ),
    });

  const handleEventShiftClick = (event: CalendarEvent) =>
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(event.id)) next.delete(event.id);
      else next.add(event.id);
      return next;
    });

  const handleEventContextMenu = (event: CalendarEvent, x: number, y: number) => {
    // Act on the whole selection when the right-clicked event is part of it;
    // otherwise act on just that event.
    const ids = selectedEventIds.has(event.id) ? [...selectedEventIds] : [event.id];
    setContextMenu({
      x,
      y,
      items: [
        {
          label: ids.length > 1 ? `Delete ${ids.length} events` : "Delete event",
          destructive: true,
          icon: <Trash2 className="size-3.5" />,
          onSelect: () => setPendingEventDeletion(ids),
        },
      ],
    });
  };

  const confirmDeleteEvents = async () => {
    if (!pendingEventDeletion) return;
    const toDelete = events.data.filter((e) => pendingEventDeletion.includes(e.id));
    setPendingEventDeletion(null);
    setSelectedEventIds(new Set());
    for (const event of toDelete) {
      await events.deleteEvent(event);
    }
  };

  if (!mounted) return null;

  const visibleEvents = filterBySpace(events.data, spaceFocus);
  const visibleTasks = filterBySpace(tasks.data, spaceFocus);

  // All branches (for the agenda list) and the active branch.
  const branches = branchesForSpaces(categories.data);
  const activeBranch =
    branchPanel.open && branchPanel.activeBranchId
      ? findBranch(categories.data, branchPanel.activeBranchId)
      : null;
  const panelTasks = activeBranch
    ? resolveBranchTasks(activeBranch, tasks.data)
    : [];

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
          onSelectSpace={handleSelectSpace}
          onCreateSpace={() => setSpaceEditor({ mode: "create" })}
          onEditSpace={(category) => setSpaceEditor({ mode: "edit", category })}
          branches={branches}
          activeBranchId={branchPanel.activeBranchId}
          onOpenBranch={handleOpenBranch}
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
          <div className="flex-1">
            <LoadingSpinner />
          </div>
        ) : (
          <div ref={calendarContentRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card">
            {view === "month" && (
              <MonthGrid
                selectedDate={selectedDate}
                viewDate={viewDate}
                events={visibleEvents}
                tasks={visibleTasks}
                categories={categories.data}
                onDateSelect={handleDateSelect}
                onViewDateChange={setViewDate}
                onCreateEvent={handleCreateEvent}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
                onDayContextMenu={handleDayContextMenu}
                onEventShiftClick={handleEventShiftClick}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selectedEventIds}
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
                onCreateEvent={handleCreateEvent}
                onCreateEventRange={handleCreateEventRange}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
                onSlotContextMenu={handleSlotContextMenu}
                onEventShiftClick={handleEventShiftClick}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selectedEventIds}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
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
                onCreateEvent={handleCreateEvent}
                onCreateEventRange={handleCreateEventRange}
                onEventClick={handleEventClick}
                onTaskClick={tasks.toggleComplete}
                onSlotContextMenu={handleSlotContextMenu}
                onEventShiftClick={handleEventShiftClick}
                onEventContextMenu={handleEventContextMenu}
                selectedEventIds={selectedEventIds}
                onEventMove={events.changeEventTime}
                onEventResize={events.changeEventTime}
                view={view}
                onViewChange={setView}
              />
            )}
          </div>
        )}

        {/* Space Panel (fourth region). Pinned: an in-flow column whose width
            animates 0<->330 so the canvas reflows in the same transition.
            Below 1200px: an overlay sheet with a scrim; below 900px: full
            screen. Both overlay modes are modal dialogs (see SpacePanel). */}
        {panelMode === "pinned" ? (
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
                  tasks={panelTasks}
                  modal={false}
                  onClose={handleClosePanel}
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
                onClick={handleClosePanel}
                className="absolute inset-0 z-40 bg-foreground/20 motion-safe:animate-[fadeIn_180ms_ease-out]"
              />
              <div
                className={cn(
                  "absolute inset-y-0 right-0 z-50 motion-safe:animate-[fadeIn_180ms_ease-out]",
                  panelMode === "fullscreen" ? "inset-x-0 w-full" : "w-[330px]"
                )}
              >
                <SpacePanel
                  branch={activeBranch}
                  tasks={panelTasks}
                  modal
                  onClose={handleClosePanel}
                  onToggleComplete={tasks.toggleComplete}
                  onCreateTask={(title) => tasks.createTask(title, undefined, activeBranch.spaceId)}
                  onOpenSettings={() => handleEditSpaceById(activeBranch.spaceId)}
                />
              </div>
            </>
          )
        )}
      {eventPopover && (
        <EventCreatePopover
          key={popoverKey}
          anchorRect={eventPopover.rect}
          side={eventPopover.side}
          event={eventPopover.event}
          initialStart={eventPopover.start}
          initialEnd={eventPopover.end ?? undefined}
          initialSpaceId={eventPopover.initialSpaceId}
          categories={categories.data}
          breadcrumb={(() => {
            const spaceId = eventPopover.event?.category_id;
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
                handleOpenBranch(branch);
                setEventPopover(null);
              },
            };
          })()}
          onSubmit={handlePopoverSubmit}
          onDelete={eventPopover.event ? handleDeleteEvent : undefined}
          onClose={() => setEventPopover(null)}
          submitting={popoverSubmitting}
          error={popoverError}
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

      {pendingEventDeletion && (
        <Dialog open onOpenChange={() => setPendingEventDeletion(null)}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>
                {pendingEventDeletion.length > 1
                  ? `Delete ${pendingEventDeletion.length} events?`
                  : "Delete this event?"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">This can&apos;t be undone.</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingEventDeletion(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDeleteEvents}>
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
