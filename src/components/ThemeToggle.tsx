"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/** Icon shows the destination, not the current state (Sun = "go light", Moon =
 *  "go dark"), which is the standard convention for theme toggles. The icon is
 *  suppressed until `mounted` is true so it doesn't flash the wrong icon while
 *  React state catches up to the preference the no-flash script already applied
 *  to the DOM. */
export default function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
    >
      {mounted && (theme === "dark" ? <Sun size={18} /> : <Moon size={18} />)}
    </button>
  );
}
