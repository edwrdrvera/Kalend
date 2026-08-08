"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import MiniCalendar from "./MiniCalendar";

interface CalendarSidebarProps {
  currentDate: Date;
  viewDate: Date;
  onDateSelect: (date: Date) => void;
  onViewDateChange: (date: Date) => void;
}

export default function CalendarSidebar({
  currentDate,
  viewDate,
  onDateSelect,
  onViewDateChange,
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

      <div inert={collapsed} className={cn("w-64 transition-opacity duration-150", collapsed && "opacity-0")}>
        <MiniCalendar
          currentDate={currentDate}
          viewDate={viewDate}
          onDateSelect={onDateSelect}
          onViewDateChange={onViewDateChange}
        />
      </div>
    </aside>
  );
}
