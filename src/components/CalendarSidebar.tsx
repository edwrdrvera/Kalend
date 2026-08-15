"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import MiniCalendar from "./MiniCalendar";
import TaskList from "./TaskList";
import CategoryManager from "./CategoryManager";
import SettingsMenu from "./SettingsMenu";
import type { CalendarCategory, CalendarTask } from "./Calendar";

interface CalendarSidebarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
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
  onViewDateChange,
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
        "flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-neutral-800 bg-[#191919] transition-[width] duration-200 ease-in-out",
        collapsed ? "w-12" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="p-1 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 shrink-0"
        >
          <Menu size={18} />
        </button>
      </div>

      <div inert={collapsed} className={cn("flex w-64 flex-1 flex-col transition-opacity duration-150", collapsed && "opacity-0")}>
        <MiniCalendar
          currentDate={currentDate}
          viewDate={viewDate}
          onDateSelect={onDateSelect}
          onViewDateChange={onViewDateChange}
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
        <div className="mt-auto flex justify-end p-4">
          <SettingsMenu />
        </div>
      </div>
    </aside>
  );
}
