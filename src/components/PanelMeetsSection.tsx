"use client";

import type { BranchMeet } from "@/lib/branch-types";

interface PanelMeetsSectionProps {
  meets: BranchMeet[];
}

export default function PanelMeetsSection({ meets }: PanelMeetsSectionProps) {
  if (meets.length === 0) return null;

  return (
    <section aria-label="Meets" className="px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Meets
      </h3>
      <div className="mt-2 flex flex-col gap-1.5">
        {meets.map((meet, index) => (
          <div key={`${meet.label}-${index}`} className="flex items-baseline gap-3 text-[13px]">
            <span className="w-[72px] shrink-0 text-foreground">{meet.label}</span>
            <span className="min-w-0 truncate text-muted-foreground">{meet.pattern}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
