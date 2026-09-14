"use client";

import { ChevronRight } from "lucide-react";

interface SpacePanelFooterProps {
  onOpenSettings: () => void;
}

export default function SpacePanelFooter({ onOpenSettings }: SpacePanelFooterProps) {
  return (
    <footer className="border-t border-border bg-[var(--mini-cal-bg)] px-4 py-3">
      <button
        type="button"
        aria-label="Space settings"
        onClick={onOpenSettings}
        className="flex w-full items-center justify-between rounded-md text-[11.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>Space settings</span>
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </button>
    </footer>
  );
}
