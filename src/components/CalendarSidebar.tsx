"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MiniCalendar from "./MiniCalendar";
import CategoryManager from "./CategoryManager";
import SettingsMenu from "./SettingsMenu";
import TaskList from "./TaskList";
import type { CalendarCategory, CalendarEvent, CalendarTask } from "@/lib/calendar-types";

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

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        className="absolute left-3 top-3 z-30 grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm md:hidden"
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

      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-50 flex h-full w-[260px] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-card shadow-xl transition-transform duration-200 ease-in-out md:relative md:z-auto md:w-[260px] md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="absolute right-12 top-6 z-10 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <X className="size-4" />
        </button>

        <div className="flex min-h-full w-full flex-1 flex-col">
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
          />
          <TaskList
            tasks={tasks}
            events={events}
            selectedDate={currentDate}
            loading={tasksLoading || eventsLoading}
            categories={categories}
            onCreateTask={onCreateTask}
            onToggleComplete={onToggleTaskComplete}
            onDeleteTask={onDeleteTask}
            onEventClick={onEventClick}
            selectedSpaceId={selectedSpaceId}
          />
          <div className="mt-auto pt-2">
            <MiniCalendar
              currentDate={currentDate}
              viewDate={viewDate}
              onDateSelect={onDateSelect}
            />
            <div className="flex justify-end border-t border-border px-4 py-3">
              <SettingsMenu />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
