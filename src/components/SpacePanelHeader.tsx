"use client";

import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES } from "@/lib/event-colors";
import type { Branch } from "@/lib/branch-types";

interface SpacePanelHeaderProps {
  branch: Branch;
  onClose: () => void;
  onOverflow?: () => void;
}

const ICON_BUTTON_CLS =
  "grid size-7 shrink-0 place-items-center rounded-[7px] border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function SpacePanelHeader({
  branch,
  onClose,
  onOverflow,
}: SpacePanelHeaderProps) {
  return (
    <header className="border-b border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground">{branch.spaceName}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Branch options"
            onClick={onOverflow}
            className={ICON_BUTTON_CLS}
          >
            <MoreHorizontal className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className={ICON_BUTTON_CLS}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "size-[10px] shrink-0 rounded-[3px]",
            EVENT_COLOR_SWATCH_CLASSES[branch.color]
          )}
        />
        <h2 className="truncate text-[20px] font-semibold tracking-tight text-foreground">
          {branch.name}
        </h2>
      </div>

      {branch.description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/75">
          {branch.description}
        </p>
      ) : null}
    </header>
  );
}
