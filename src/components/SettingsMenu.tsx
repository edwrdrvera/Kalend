"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Moon, Settings, Sun } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

/** Account controls open upward because the trigger sits at the bottom of
 *  the sidebar, with no room below it for the menu. */
export default function SettingsMenu() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, mounted, toggleTheme } = useTheme();

  async function handleLogout() {
    setError(null);
    setIsLoggingOut(true);

    try {
      const { error: signOutError } = await createClient().auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Settings"
        title="Settings"
        className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span>Settings</span>
        <Settings className="ml-auto size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-60">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
          <PopoverDescription>Manage your Kalend preferences and session.</PopoverDescription>
        </PopoverHeader>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
          className="mb-3 flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {mounted && (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />)}
          <span>Dark mode</span>
          <span
            aria-hidden="true"
            className={cn(
              "ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
              theme === "dark" ? "bg-primary" : "bg-foreground/75"
            )}
          >
            <span
              className={cn(
                "size-4 rounded-full bg-white shadow-sm transition-transform",
                theme === "dark" && "translate-x-4"
              )}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
        {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
