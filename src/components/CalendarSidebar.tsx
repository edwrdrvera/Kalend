"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Calendar, Layers3, Menu, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverBackdrop, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MiniCalendar from "./MiniCalendar";
import CategoryManager from "./CategoryManager";
import SettingsMenu from "./SettingsMenu";
import { AgendaDetailList } from "./AgendaSummary";
import SidebarAgendaPanel from "./SidebarAgendaPanel";
import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLOR_SWATCH_CLASSES,
  isEventColor,
  type EventColor,
} from "@/lib/event-colors";
import { summarizeSidebarAgenda, buildSidebarAgenda } from "@/lib/sidebar-agenda";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";

const SIDEBAR_WIDTH_KEY = "kalend:sidebar-width";
const SIDEBAR_COLLAPSED_KEY = "kalend:sidebar-collapsed";
const PINNED_SPACES_KEY = "kalend:pinned-spaces";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 260;
/** Dragging below this threshold collapses the sidebar. */
const COLLAPSE_THRESHOLD = 180;

function readPinnedSpaces(): string[] {
  try {
    const stored = localStorage.getItem(PINNED_SPACES_KEY);
    if (stored) return JSON.parse(stored) as string[];
  } catch {
    // Storage unavailable or malformed.
  }
  return [];
}

function writePinnedSpaces(ids: string[]) {
  try {
    localStorage.setItem(PINNED_SPACES_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable.
  }
}

interface CalendarSidebarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: CalendarTask[];
  events: CalendarEvent[];
  tasksLoading: boolean;
  eventsLoading: boolean;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
  categories: CalendarCategory[];
  categoriesLoading: boolean;
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  hiddenCategoryIds: string[];
  onToggleCategoryVisibility: (categoryId: string) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => void;
  onDeleteCategory: (category: CalendarCategory) => Promise<void>;
}

function CollapsedRail({
  categories,
  pinnedSpaceIds,
  selectedSpaceId,
  hiddenCategoryIds,
  onSelectSpace,
  onExpand,
  events,
  tasks,
  selectedDate,
  loading,
  onToggleTaskComplete,
  onDeleteTask,
  onEventClick,
}: {
  categories: CalendarCategory[];
  pinnedSpaceIds: string[];
  selectedSpaceId: string | null;
  hiddenCategoryIds: string[];
  onSelectSpace: (id: string | null) => void;
  onExpand: () => void;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  selectedDate: Date;
  loading: boolean;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  onEventClick: (event: CalendarEvent, anchorRect: DOMRect) => void;
}) {
  const pinnedCategories = categories.filter((c) => pinnedSpaceIds.includes(c.id));

  // Agenda counts for the badge.
  const sections = buildSidebarAgenda(events, tasks, selectedDate);
  const summary = summarizeSidebarAgenda(sections, tasks);
  const hasOverdue = summary.overdueTaskCount > 0;
  const isEmpty = summary.activeItemCount === 0;

  return (
    <div className="hidden shrink-0 flex-col items-center border-r border-border bg-card py-2 md:flex">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand sidebar"
        title="Expand sidebar"
        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="size-4" />
      </button>

      {/* Pinned spaces */}
      <div className="mt-3 flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onSelectSpace(null)}
          aria-label="All Spaces"
          title="All Spaces"
          className={cn(
            "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            selectedSpaceId === null && "bg-[#e8e7e5] text-foreground dark:bg-[#262626]"
          )}
        >
          <Layers3 className="size-3.5" />
        </button>
        {pinnedCategories.map((cat) => {
          const color: EventColor = isEventColor(cat.color) ? cat.color : DEFAULT_EVENT_COLOR;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectSpace(cat.id)}
              aria-label={cat.name}
              title={cat.name}
              className={cn(
                "grid size-7 place-items-center rounded-md transition-colors hover:bg-muted",
                selectedSpaceId === cat.id && "bg-muted"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-[3px]",
                  EVENT_COLOR_SWATCH_CLASSES[color],
                  hiddenCategoryIds.includes(cat.id) && "opacity-30 grayscale"
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Agenda summary badge with detail popover */}
      <div className="mt-3 flex flex-col items-center">
        <Popover>
          <PopoverTrigger
            disabled={isEmpty && !loading}
            aria-label={
              loading
                ? "Loading agenda"
                : isEmpty
                  ? "Nothing scheduled"
                  : `${summary.activeItemCount} items today`
            }
            title={
              loading
                ? "Loading…"
                : isEmpty
                  ? "Nothing scheduled"
                  : `${summary.activeItemCount} items today`
            }
            className={cn(
              "relative grid size-8 place-items-center rounded-md transition-colors hover:bg-muted",
              hasOverdue ? "text-destructive" : "text-muted-foreground hover:text-foreground",
              isEmpty && "opacity-50"
            )}
          >
            {hasOverdue ? (
              <AlertTriangle className="size-4" />
            ) : (
              <Calendar className="size-4" />
            )}
            {!loading && !isEmpty && (
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
                  hasOverdue ? "bg-destructive" : "bg-primary"
                )}
              >
                {summary.activeItemCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverBackdrop />
          <PopoverContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-[min(340px,calc(100vw-2rem))] max-h-[min(400px,70vh)] overflow-y-auto p-2.5"
          >
            <AgendaDetailList
              sections={sections}
              categories={categories}
              onEventClick={onEventClick}
              onToggleComplete={onToggleTaskComplete}
              onDeleteTask={onDeleteTask}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={onExpand}
          aria-label="Settings"
          title="Settings"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function CalendarSidebar({
  currentDate,
  viewDate,
  onDateSelect,
  tasks,
  events,
  tasksLoading,
  eventsLoading,
  onCreateTask,
  onToggleTaskComplete,
  onDeleteTask,
  onEventClick,
  categories,
  categoriesLoading,
  selectedSpaceId,
  onSelectSpace,
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CalendarSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinnedSpaceIds, setPinnedSpaceIds] = useState(readPinnedSpaces);

  const togglePinSpace = useCallback((id: string) => {
    setPinnedSpaceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writePinnedSpaces(next);
      return next;
    });
  }, []);

  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
      }
    } catch {
      // Storage unavailable.
    }
    return DEFAULT_WIDTH;
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const persistCollapsed = (value: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    } catch {
      // Storage unavailable.
    }
  };

  const persistWidth = (value: number) => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(value));
    } catch {
      // Storage unavailable.
    }
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragStartX.current = e.clientX;
      dragStartWidth.current = collapsed ? 0 : width;
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width, collapsed]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - dragStartX.current;
      const raw = dragStartWidth.current + delta;
      if (raw < COLLAPSE_THRESHOLD) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, raw)));
      }
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    persistCollapsed(collapsed);
    if (!collapsed) persistWidth(width);
  }, [dragging, width, collapsed]);

  // Reset to default on double-click.
  const handleDoubleClick = useCallback(() => {
    if (collapsed) {
      setCollapsed(false);
      persistCollapsed(false);
      setWidth(DEFAULT_WIDTH);
      persistWidth(DEFAULT_WIDTH);
    } else {
      setWidth(DEFAULT_WIDTH);
      persistWidth(DEFAULT_WIDTH);
    }
  }, [collapsed]);

  const expandSidebar = useCallback(() => {
    setCollapsed(false);
    persistCollapsed(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="absolute left-3 top-[9px] z-30 grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm md:hidden"
      >
        <Menu className="size-4" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="absolute inset-0 z-40 bg-foreground/15 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Collapsed icon rail — hamburger + pinned spaces + agenda + settings */}
      {collapsed && (
        <CollapsedRail
          categories={categories}
          pinnedSpaceIds={pinnedSpaceIds}
          selectedSpaceId={selectedSpaceId}
          hiddenCategoryIds={hiddenCategoryIds}
          onSelectSpace={onSelectSpace}
          onExpand={expandSidebar}
          events={events}
          tasks={tasks}
          selectedDate={currentDate}
          loading={tasksLoading || eventsLoading}
          onToggleTaskComplete={onToggleTaskComplete}
          onDeleteTask={onDeleteTask}
          onEventClick={onEventClick}
        />
      )}

      <aside
        style={{ "--sidebar-w": `${width}px` } as React.CSSProperties}
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-border bg-card shadow-xl transition-transform duration-200 ease-in-out sm:w-[min(320px,calc(100vw-2rem))] md:relative md:z-auto md:w-[var(--sidebar-w)] md:translate-x-0 md:shadow-none md:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:hidden",
          dragging && "select-none"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <X className="size-4" />
        </button>

        {/* Zone 1: Spaces Rail */}
        <div className="shrink-0 overflow-y-auto border-b border-border pt-14 md:pt-0" style={{ maxHeight: "40%" }}>
          <CategoryManager
            categories={categories}
            loading={categoriesLoading}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={onSelectSpace}
            hiddenCategoryIds={hiddenCategoryIds}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            onCreateCategory={onCreateCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
            pinnedSpaceIds={pinnedSpaceIds}
            onTogglePinSpace={togglePinSpace}
          />
        </div>

        {/* Zone 2: Agenda Panel */}
        <SidebarAgendaPanel
          events={events}
          tasks={tasks}
          selectedDate={currentDate}
          loading={tasksLoading || eventsLoading}
          categories={categories}
          selectedSpaceId={selectedSpaceId}
          onCreateTask={onCreateTask}
          onToggleTaskComplete={onToggleTaskComplete}
          onDeleteTask={onDeleteTask}
          onEventClick={onEventClick}
        />

        {/* Zone 3: Pinned Bottom */}
        <div className="shrink-0 border-t border-border pt-1">
          <MiniCalendar
            currentDate={currentDate}
            viewDate={viewDate}
            onDateSelect={onDateSelect}
            collapsible
          />
          <div className="flex items-center justify-end border-t border-border px-2 py-1.5">
            <SettingsMenu />
          </div>
        </div>

        {/* Drag handle for resizing — desktop only */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={MIN_WIDTH}
          aria-valuemax={MAX_WIDTH}
          aria-valuenow={collapsed ? 0 : width}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={cn(
            "absolute inset-y-0 right-0 z-10 hidden w-1.5 cursor-col-resize md:block",
            dragging ? "bg-primary/30" : "hover:bg-primary/15"
          )}
        />
      </aside>
    </>
  );
}
