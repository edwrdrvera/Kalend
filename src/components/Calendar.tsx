"use client";

import { useState, useEffect } from "react";
import CalendarSidebar from "./CalendarSidebar";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
  };

  if (!mounted) return null;

  return (
    <div className="flex h-full w-full overflow-hidden text-neutral-200">
      <CalendarSidebar
        currentDate={currentDate}
        onDateSelect={handleDateSelect}
      />
    </div>
  );
}
