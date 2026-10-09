"use client";

import { ChevronRight } from "lucide-react";

interface SpacePanelFooterProps {
  /** "Space settings" or "Group settings". */
  label: string;
  onOpenSettings: () => void;
}

export default function SpacePanelFooter({ label, onOpenSettings }: SpacePanelFooterProps) {
  return (
    <footer className="border-t border-border bg-[var(--mini-cal-bg)] px-4 py-3">
      <button
        type="button"
        aria-label={label}
        onClick={onOpenSettings}
        className="flex w-full items-center justify-between rounded-md text-[11.5px] text-muted-foreground hover:text-foreground focus-ring"
      >
        <span>{label}</span>
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </button>
    </footer>
  );
}
