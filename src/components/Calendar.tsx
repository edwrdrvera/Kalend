"use client";

import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { useState } from "react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-px mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="text-center text-gray-300">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {daysInMonth.map((date) => (
          <div
            key={date.toString()}
            className="min-h-30 bg-white p-2 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-400">{format(date, "d")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
