"use client";

import { useState } from "react";
import { useTheme } from "@/lib/theme";
import { ChevronRight, Menu } from "lucide-react";
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

/** Collapsible section row — a "Tasks >" / "Categories >" header that
 *  expands to reveal the full panel when clicked. Matches the design's
 *  sidebar section style. */
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
      >
        {title}
        <ChevronRight
          size={16}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-90"
          )}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
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
  const { theme } = useTheme();
  const wordmarkTone = theme === "dark" ? "white" : "ink";

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out",
        collapsed ? "w-12" : "w-[280px]"
      )}
    >
      {/* Top bar: always rendered outside the inert zone. When collapsed the
          sidebar is only 48px wide so we show just the menu toggle centered;
          ThemeToggle is hidden until expanded so nothing fights for space. */}
      <div className={cn(
        "flex shrink-0 items-center",
        collapsed ? "justify-center p-2" : "justify-between gap-2 p-4"
      )}>
        {!collapsed && <KalendWordmark size="sm" tone={wordmarkTone} animation="scatter" />}
        <div className={cn("flex shrink-0 items-center gap-1", !collapsed && "ml-auto")}>
          {!collapsed && <ThemeToggle />}
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

      <div inert={collapsed} className={cn("flex w-[280px] flex-1 flex-col transition-opacity duration-150", collapsed && "opacity-0")}>
        <MiniCalendar
          currentDate={currentDate}
          viewDate={viewDate}
          onDateSelect={onDateSelect}
        />

        {/* Tasks and Categories as collapsible sections — click the row
            header to expand the full panel; chevron rotates to indicate
            open state. Default closed matches the design's sidebar. */}
        <SidebarSection title="Tasks">
          <TaskList
            tasks={tasks}
            loading={tasksLoading}
            categories={categories}
            onCreateTask={onCreateTask}
            onToggleComplete={onToggleTaskComplete}
            onDeleteTask={onDeleteTask}
          />
        </SidebarSection>

        <SidebarSection title="Categories">
          <CategoryManager
            categories={categories}
            loading={categoriesLoading}
            onCreateCategory={onCreateCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
          />
        </SidebarSection>

        <div className="mt-auto flex justify-end p-4">
          <SettingsMenu />
        </div>
      </div>
    </aside>
  );
}
