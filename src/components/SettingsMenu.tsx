"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

/** Settings entry point pinned to the sidebar's bottom-right corner. Menu
 *  content is a placeholder for now (issue #72) — no real settings exist
 *  yet, this just establishes the button and menu ahead of them. Opens
 *  upward (`side="top"`) since the trigger sits at the bottom of the
 *  sidebar, with no room below it for the menu to open into. */
export default function SettingsMenu() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
      >
        <Settings size={18} />
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
          <PopoverDescription>More settings are coming soon.</PopoverDescription>
        </PopoverHeader>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
