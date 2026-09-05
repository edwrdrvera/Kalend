"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/** Icon button that toggles between light and dark mode. Always one click —
 *  shows a Sun when in dark mode (click to switch to light) and a Moon when
 *  in light mode (click to switch to dark). */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
