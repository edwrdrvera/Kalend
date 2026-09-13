"use client";

import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES } from "@/lib/event-colors";
import type { Branch } from "@/lib/branch-types";

interface BranchListProps {
  branches: Branch[];
  activeBranchId: string | null;
  onOpenBranch: (branch: Branch) => void;
}

// Shown at the top of the agenda column once a Space is active: the Space's
// branches. Clicking one opens the Space Panel for that branch. Hidden when
// the Space has no branches.
export default function BranchList({
  branches,
  activeBranchId,
  onOpenBranch,
}: BranchListProps) {
  if (branches.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-border px-3 py-3">
      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Branches
      </p>
      <div className="flex flex-col gap-0.5">
        {branches.map((branch) => {
          const isActive = branch.id === activeBranchId;
          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => onOpenBranch(branch)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-foreground hover:bg-muted/50"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-[10px] shrink-0 rounded-[3px]",
                  EVENT_COLOR_SWATCH_CLASSES[branch.color]
                )}
              />
              <span className="truncate">{branch.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
