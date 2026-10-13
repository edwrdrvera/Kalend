"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

// Both icons stay mounted and crossfade in place, like the nav's menu toggle.
const ICON_CLS =
  "absolute inset-0 size-4 transition-[opacity,transform,filter] duration-150 ease-out";
const ICON_HIDDEN = "scale-75 opacity-0 blur-[2px] motion-reduce:scale-100";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? (dark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className={cn(
        "focus-ring grid size-10 place-items-center rounded-lg text-[var(--kal-muted)] transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] hover:bg-[var(--kal-border)]/50 hover:text-[var(--kal-ink)]",
        className
      )}
    >
      {mounted && (
        <span className="relative size-4">
          <Sun className={cn(ICON_CLS, !dark && ICON_HIDDEN)} aria-hidden />
          <Moon className={cn(ICON_CLS, dark && ICON_HIDDEN)} aria-hidden />
        </span>
      )}
    </button>
  );
}
