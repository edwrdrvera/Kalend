"use client";

import { useState, useEffect } from "react";
import { startOfMonth } from "date-fns";
import CalendarSidebar from "./CalendarSidebar";
import MonthGrid from "./MonthGrid";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Selecting a day (from either the mini calendar or the main grid) also
  // moves the shared view to that day's month, so both stay in sync no
  // matter which one triggered the change.
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setViewDate(startOfMonth(date));
  };

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full overflow-hidden text-neutral-200">
      <CalendarSidebar
        currentDate={selectedDate}
        viewDate={viewDate}
        onDateSelect={handleDateSelect}
        onViewDateChange={setViewDate}
      />
      <MonthGrid
        selectedDate={selectedDate}
        viewDate={viewDate}
        onDateSelect={handleDateSelect}
        onViewDateChange={setViewDate}
      />
    </div>
  );
}
