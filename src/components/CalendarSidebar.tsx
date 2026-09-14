"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import IconRail from "./IconRail";
import AgendaColumn from "./AgendaColumn";
import MiniCalendar from "./MiniCalendar";
import MobileSpacesBar from "./MobileSpacesBar";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";
import type { Branch } from "@/lib/branch-types";

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
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  onCreateSpace: () => void;
  onEditSpace: (category: CalendarCategory) => void;
  branches: Branch[];
  activeBranchId: string | null;
  onOpenBranch: (branch: Branch) => void;
  /** Account menu element for the desktop rail, composed by the state owner. */
  accountMenu?: ReactNode;
  /** Account menu element for the mobile slide-out (light-surface styling). */
  mobileAccountMenu?: ReactNode;
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
  selectedSpaceId,
  onSelectSpace,
  onCreateSpace,
  onEditSpace,
  branches,
  activeBranchId,
  onOpenBranch,
  accountMenu,
  mobileAccountMenu,
}: CalendarSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // The agenda's branch list shows only the active Space's branches; the rail
  // flyouts use the full list.
  const spaceBranches = selectedSpaceId
    ? branches.filter((b) => b.spaceId === selectedSpaceId)
    : [];

  const agendaProps = {
    selectedDate: currentDate,
    events,
    tasks,
    categories,
    loading: tasksLoading || eventsLoading,
    selectedSpaceId,
    onCreateTask,
    onToggleTaskComplete,
    onDeleteTask,
    onEventClick,
    branches: spaceBranches,
    activeBranchId,
    onOpenBranch,
  } as const;

  const miniCalProps = {
    currentDate,
    viewDate,
    onDateSelect,
  } as const;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="absolute left-3 top-[9px] z-30 grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm md:hidden"
      >
        <Menu className="size-4" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="absolute inset-0 z-40 bg-foreground/15 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Desktop sidebar: icon rail + agenda column + mini calendar */}
      <div className="hidden h-full shrink-0 md:flex">
        <IconRail
          categories={categories}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={onSelectSpace}
          onCreateSpace={onCreateSpace}
          onEditSpace={onEditSpace}
          accountMenu={accountMenu}
        />
        <div className="flex h-full w-[300px] flex-col border-r border-border">
          <div className="min-h-0 flex-1 overflow-hidden">
            <AgendaColumn {...agendaProps} />
          </div>
          <MiniCalendar {...miniCalProps} />
        </div>
      </div>

      {/* Mobile sidebar: slide-out overlay with agenda + mini calendar */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-border bg-card shadow-xl transition-transform duration-200 ease-in-out sm:w-[min(320px,calc(100vw-2rem))] md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col pt-14">
          <MobileSpacesBar
            categories={categories}
            selectedSpaceId={selectedSpaceId}
            onSelectSpace={onSelectSpace}
            onCreateSpace={onCreateSpace}
            accountMenu={mobileAccountMenu}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <AgendaColumn {...agendaProps} />
          </div>
          <MiniCalendar {...miniCalProps} />
        </div>
      </aside>
    </>
  );
}
