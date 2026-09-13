"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { APP_INPUT_CLS } from "@/components/DateField";

/** Hand-picked emoji relevant to a student calendar. Ordered loosely by
 *  category (study, sports/health, social, work/life) so scanning feels
 *  natural without needing explicit section headers. */
const ICONS = [
  "📚", "📖", "✏️", "🎓", "💻", "🧪",
  "🏃", "💪", "🧘", "⚽", "🏀", "🏊",
  "🎉", "🍕", "☕", "🎬", "🎵", "🎮",
  "💼", "📊", "🤝", "💡", "🏠", "✈️",
];

const GRID_COLS = 6;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  maxLength: number;
}

export default function IconPicker({ value, onChange, maxLength }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id="new-event-icon"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        onFocus={() => setOpen(true)}
        placeholder="🙂"
        title="Optional emoji or symbol for this event"
        maxLength={maxLength}
        className={cn(APP_INPUT_CLS, "w-9 shrink-0 cursor-pointer text-center")}
      />

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border border-border bg-popover p-1.5 shadow-lg">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
          >
            {ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                className="flex size-8 items-center justify-center rounded text-base transition-colors hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-1 w-full rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
