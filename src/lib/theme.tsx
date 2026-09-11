"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kalend-theme";

/** Pure helper: given a raw localStorage value and the OS dark-mode flag,
 *  return the canonical theme to use. Exported for unit tests. */
export function resolveInitialTheme(
  stored: string | null,
  prefersColorSchemeDark: boolean
): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersColorSchemeDark ? "dark" : "light";
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  theme: Theme;
  /** false on the server and until the mount effect has read localStorage.
   *  Components that render theme-dependent UI should wait for this. */
  mounted: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark"); // server-safe default
  const [mounted, setMounted] = useState(false);
  // Guard: skip localStorage write on the very first render so the sync effect
  // doesn't clobber a stored preference before the mount effect has read it.
  const syncReady = useRef(false);

  // Sync the <html> class and localStorage whenever theme changes — but only
  // after the mount effect has resolved the real initial value.
  useEffect(() => {
    if (!syncReady.current) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage blocked (e.g. private browsing with strict settings)
    }
  }, [theme]);

  // On mount: read the stored preference (or OS default), set it, then allow
  // the sync effect to run on subsequent changes.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const prefersColorSchemeDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const resolved = resolveInitialTheme(stored, prefersColorSchemeDark);
    // Apply the class directly here (don't wait for the sync effect) so the
    // DOM matches state as soon as we know the real theme.
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    syncReady.current = true;
    // One-time mount read from localStorage — calling setState here is correct
    // and intentional (SSR-safe theme init); suppress the cascading-render rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
    setMounted(true);
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext value={{ theme, mounted, toggleTheme }}>
      {children}
    </ThemeContext>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
