"use client";

import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import MiniCalendar from "./MiniCalendar";
import CategoryManager from "./CategoryManager";
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
  categories,
  categoriesLoading,
  hiddenCategoryIds,
  onToggleCategoryVisibility,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CalendarSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, mounted, toggleTheme } = useTheme();

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
          "absolute inset-y-0 left-0 z-50 flex h-full w-[320px] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-card shadow-xl transition-transform duration-200 ease-in-out md:relative md:z-auto md:w-[21.25vw] md:min-w-[280px] md:max-w-[420px] md:translate-x-0 md:shadow-none",
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
          <div className="hidden items-center gap-3 px-8 pb-5 pt-7 md:flex" aria-hidden="true">
            <span className="size-3.5 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
            <span className="size-3.5 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
            <span className="size-3.5 rounded-full bg-[#28c840] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />
          </div>

          <CategoryManager
            categories={categories}
            loading={categoriesLoading}
            hiddenCategoryIds={hiddenCategoryIds}
            onToggleCategoryVisibility={onToggleCategoryVisibility}
            onCreateCategory={onCreateCategory}
            onUpdateCategory={onUpdateCategory}
            onDeleteCategory={onDeleteCategory}
          />

          <div className="mt-auto pt-8">
            <MiniCalendar
              currentDate={currentDate}
              viewDate={viewDate}
              onDateSelect={onDateSelect}
            />

            <div className="border-t border-border px-7 py-5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
                className="flex w-full items-center gap-3 text-sm font-semibold text-foreground"
              >
                {mounted && (theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />)}
                <span>Dark mode</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-auto flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                    theme === "dark" ? "bg-primary" : "bg-foreground/75"
                  )}
                >
                  <span
                    className={cn(
                      "size-5 rounded-full bg-white shadow-sm transition-transform",
                      theme === "dark" && "translate-x-5"
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
