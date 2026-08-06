"use client";

import { Menu } from "lucide-react";
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
  return (
    <aside className="w-64 border-r border-neutral-800 bg-[#191919] flex shrink-0 flex-col h-full overflow-y-auto">
      <div className="p-4 flex items-center justify-between">
        <button className="p-1 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400">
          <Menu size={18} />
        </button>
      </div>

      <MiniCalendar
        currentDate={currentDate}
        viewDate={viewDate}
        onDateSelect={onDateSelect}
        onViewDateChange={onViewDateChange}
      />
    </aside>
  );
}
