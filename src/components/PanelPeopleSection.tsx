"use client";

import type { BranchPerson } from "@/lib/branch-types";

interface PanelPeopleSectionProps {
  people: BranchPerson[];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export default function PanelPeopleSection({ people }: PanelPeopleSectionProps) {
  if (people.length === 0) return null;

  return (
    <section aria-label="People" className="px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        People
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {people.map((person) => (
          <div key={person.id} className="flex items-center gap-2.5">
            {person.avatarUrl ? (
              <img
                src={person.avatarUrl}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground"
              >
                {initialsFor(person.name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] text-foreground">{person.name}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
