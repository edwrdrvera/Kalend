"use client";

import { Link2 } from "lucide-react";
import type { BranchLink } from "@/lib/branch-types";

interface PanelLinksSectionProps {
  links: BranchLink[];
}

export default function PanelLinksSection({ links }: PanelLinksSectionProps) {
  if (links.length === 0) return null;

  return (
    <section aria-label="Links" className="px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Links
      </h3>
      <div className="mt-2 flex flex-col gap-[7px]">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 rounded-sm text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{link.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
