"use client";

import type { ReactNode } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES } from "@/lib/event-colors";
import type { PanelSubject } from "@/lib/panel-subject";
import { ICON_BUTTON_CLS } from "./InspectorParts";

interface SpacePanelHeaderProps {
  subject: PanelSubject;
  onClose: () => void;
  onOverflow?: () => void;
  /** Rendered under the title, inside the header (the Group chips). */
  children?: ReactNode;
}

export default function SpacePanelHeader({
  subject,
  onClose,
  onOverflow,
  children,
}: SpacePanelHeaderProps) {
  return (
    <header className="border-b border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground">{subject.kind === "group" ? subject.spaceName : "Space"}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={subject.kind === "group" ? "Group options" : "Space options"}
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
            EVENT_COLOR_SWATCH_CLASSES[subject.color]
          )}
        />
        <h2 className="truncate text-[20px] font-semibold tracking-tight text-foreground">
          {subject.name}
        </h2>
      </div>
      {children}
    </header>
  );
}
