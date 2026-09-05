"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark"); // server-safe default

  // Sync the <html> class and localStorage whenever theme changes.
  useEffect(() => {
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

  // Read the stored/OS preference on mount.
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
    setTheme(resolveInitialTheme(stored, prefersColorSchemeDark));
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext value={{ theme, toggleTheme }}>
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
