"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";
import {
  ContextMenu as Menu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  icon?: ReactNode;
}

const ITEM_CLASS = "gap-2 px-2 py-1.5 text-[13px] focus-ring focus-visible:outline-offset-[-2px]";

/** Open-state for the right-click menu. A grid target calls `show` with its
 *  items. The trigger only opens when a target claimed the event, so a click
 *  on a gutter or header never opens a stale menu. */
export function useContextMenu() {
  const [items, setItems] = useState<ContextMenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const claimed = useRef(false);

  return {
    items,
    open,
    show: (next: ContextMenuItem[]) => {
      claimed.current = true;
      setItems(next);
    },
    onOpenChange: (next: boolean) => {
      if (next && !claimed.current) return;
      claimed.current = false;
      setOpen(next);
    },
  };
}

const isMenuKey = (e: KeyboardEvent) =>
  e.key === "ContextMenu" || (e.shiftKey && e.key === "F10");

/** Re-fires the native contextmenu event at the focused element, so the grid
 *  target that handles a right-click also handles the keyboard. */
function openFromKeyboard(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + Math.min(rect.width / 2, 24),
      clientY: rect.top + Math.min(rect.height / 2, 24),
    })
  );
}

interface ContextMenuProps {
  menu: ReturnType<typeof useContextMenu>;
  className?: string;
  triggerRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/** Wraps the calendar grid. Right-click, long press, Shift+F10 and the
 *  ContextMenu key open the menu for the target the grid reports to `menu`. */
export default function ContextMenu({ menu, className, triggerRef, children }: ContextMenuProps) {
  return (
    <Menu open={menu.open} onOpenChange={menu.onOpenChange}>
      <ContextMenuTrigger
        ref={triggerRef}
        className={cn("select-text", className)}
        onKeyDown={(e) => {
          if (!isMenuKey(e) || !e.currentTarget.contains(e.target as Node)) return;
          e.preventDefault();
          openFromKeyboard(e.target as HTMLElement);
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-46" side="right" align="start" sideOffset={0} alignOffset={0}>
        {menu.items.map((item) => (
          <ContextMenuItem
            key={item.label}
            variant={item.destructive ? "destructive" : "default"}
            className={ITEM_CLASS}
            onClick={item.onSelect}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </Menu>
  );
}
