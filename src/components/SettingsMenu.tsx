"use client";

import { Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Settings entry point pinned to the sidebar's bottom-right corner. Menu
 *  content is a placeholder for now (issue #72) — no real settings exist
 *  yet, this just establishes the button and menu ahead of them. Opens
 *  upward (`side="top"`) since the trigger sits at the bottom of the
 *  sidebar, with no room below it for the menu to open into. */
export default function SettingsMenu() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Settings"
        className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-800"
      >
        <Settings size={18} />
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
          <PopoverDescription>More settings are coming soon.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
