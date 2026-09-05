"use client";

import { useState } from "react";
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
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CalendarSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-card transition-[width] duration-200 ease-in-out",
        collapsed ? "w-12" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between gap-2">
        {!collapsed && <KalendWordmark size="sm" tone="white" animation="scatter" />}
        <button
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground shrink-0"
        >
          <Menu size={18} />
        </button>
      </div>

      <div inert={collapsed} className={cn("flex w-64 flex-1 flex-col transition-opacity duration-150", collapsed && "opacity-0")}>
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
        <CategoryManager
          categories={categories}
          loading={categoriesLoading}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
        <div className="mt-auto flex items-center justify-end gap-1 p-4">
          <ThemeToggle />
          <SettingsMenu />
        </div>
      </div>
    </aside>
  );
}
