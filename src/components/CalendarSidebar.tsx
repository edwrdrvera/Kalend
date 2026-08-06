"use client";

import { Menu } from "lucide-react";
import MiniCalendar from "./MiniCalendar";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function CalendarSidebar({ currentDate, onDateSelect }: CalendarSidebarProps) {
  return (
    <aside className="w-64 border-r border-neutral-800 bg-[#191919] flex shrink-0 flex-col h-full overflow-y-auto">
      <div className="p-4 flex items-center justify-between">
        <button className="p-1 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400">
          <Menu size={18} />
        </button>
      </div>

      <MiniCalendar currentDate={currentDate} onDateSelect={onDateSelect} />
    </aside>
  );
}
