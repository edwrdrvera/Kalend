"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  icon?: ReactNode;
}

interface ContextMenuProps {
  /** Viewport coordinates of the click that opened the menu. */
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 184;

/** A lightweight right-click menu positioned at the cursor. Closes on outside
 *  click, another right-click, or Escape. */
export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the menu inside the viewport.
  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
  const estHeight = items.length * 34 + 8;
  const top = Math.min(y, window.innerHeight - estHeight - 8);

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className="fixed z-[61] min-w-[168px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ top: Math.max(8, top), left: Math.max(8, left), width: MENU_WIDTH }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="menuitem"
            type="button"
            onClick={() => {
              item.onSelect();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none",
              item.destructive
                ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
                : "text-foreground hover:bg-muted focus-visible:bg-muted"
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
