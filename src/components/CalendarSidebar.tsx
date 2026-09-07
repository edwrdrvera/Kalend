"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import KalendWordmark from "./KalendWordmark";
import MiniCalendar from "./MiniCalendar";
import TaskList from "./TaskList";
import CategoryManager from "./CategoryManager";
import SettingsMenu from "./SettingsMenu";
import ThemeToggle from "./ThemeToggle";
import type { CalendarCategory, CalendarTask } from "@/lib/calendar-types";

interface CalendarSidebarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: CalendarTask[];
  tasksLoading: boolean;
  onCreateTask: (title: string, dueAt?: string, categoryId?: string | null) => Promise<void>;
  onToggleTaskComplete: (task: CalendarTask) => void;
  onDeleteTask: (task: CalendarTask) => void;
  categories: CalendarCategory[];
  categoriesLoading: boolean;
  hiddenCategoryIds: string[];
  onToggleCategoryVisibility: (categoryId: string) => void;
  onCreateCategory: (name: string, color: string) => Promise<void>;
  onUpdateCategory: (
    category: CalendarCategory,
    updates: { name?: string; color?: string }
  ) => void;
  onDeleteCategory: (category: CalendarCategory) => void;
}


export default function CalendarSidebar({
  currentDate,
  viewDate,
  onDateSelect,
  tasks,
  tasksLoading,
  onCreateTask,
  onToggleTaskComplete,
  onDeleteTask,
  categories,
  categoriesLoading,
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CalendarSidebarProps) {
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia("(max-width: 767px)").matches
  );
  const { theme } = useTheme();
  const wordmarkTone = theme === "dark" ? "white" : "ink";

  return (
    <aside
      className={cn(
        "absolute inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-sidebar/95 shadow-lg backdrop-blur transition-[width] duration-200 ease-in-out md:relative md:z-auto md:shadow-none",
        collapsed ? "w-[52px]" : "w-[292px]"
      )}
    >
      {/* The collapse control stays outside the inert zone so the sidebar can
          always be reopened, including on the compact mobile layout. */}
      <div className={cn(
        "flex shrink-0 items-center",
        collapsed ? "justify-center px-2 py-5" : "justify-between gap-2 px-5 py-5"
      )}>
        {!collapsed && <KalendWordmark size="sm" tone={wordmarkTone} animation="scatter" />}
        <div className={cn("flex shrink-0 items-center gap-1", !collapsed && "ml-auto")}>
          <button
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      <div inert={collapsed} className={cn("flex w-[292px] flex-1 flex-col transition-opacity duration-150", collapsed && "opacity-0")}>
        <CategoryManager
          categories={categories}
          loading={categoriesLoading}
          hiddenCategoryIds={hiddenCategoryIds}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />

        <MiniCalendar
          currentDate={currentDate}
          viewDate={viewDate}
          onDateSelect={onDateSelect}
        />

        <TaskList
          tasks={tasks}
          loading={tasksLoading}
          categories={categories}
          onCreateTask={onCreateTask}
          onToggleComplete={onToggleTaskComplete}
          onDeleteTask={onDeleteTask}
        />

        <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ThemeToggle />
            <span>Appearance</span>
          </div>
          <SettingsMenu />
        </div>
      </div>
    </aside>
  );
}
