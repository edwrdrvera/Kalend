import { cn } from "@/lib/utils";

// Static, illustrative September 2026 month view for the landing page hero.
// Not wired to any real data (see docs/landing-page-handoff.md): the dates,
// "Spaces", and deadline chips below are all fixed sample content.

interface SpaceFilter {
  label: string;
  dotColor: string;
  active?: boolean;
}

const SPACE_FILTERS: SpaceFilter[] = [
  { label: "CS 201", dotColor: "var(--kal-accent)", active: true },
  { label: "Thesis Project", dotColor: "var(--kal-cat-indigo)" },
  { label: "Client Work", dotColor: "var(--kal-cat-teal)" },
  { label: "Weekend Shift", dotColor: "var(--kal-cat-yellow)" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayCell {
  day: number;
  today?: boolean;
  chip?: { label: string; tint: string };
}

// September 2026: the 1st falls on a Tuesday, so with Sunday-first ordering
// the first row leads with two blank cells. Chip tints mirror the approved
// mockup 1:1.
const CALENDAR_CELLS: (DayCell | null)[] = [
  null,
  null,
  { day: 1 },
  { day: 2 },
  { day: 3, chip: { label: "CS 201", tint: "var(--kal-cat-blue-tint)" } },
  { day: 4, today: true, chip: { label: "Essay Due", tint: "var(--kal-cat-orange-tint)" } },
  { day: 5 },

  { day: 6 },
  { day: 7 },
  { day: 8, chip: { label: "Study Grp", tint: "var(--kal-cat-purple-tint)" } },
  { day: 9 },
  { day: 10 },
  { day: 11, chip: { label: "Math HW", tint: "var(--kal-cat-green-tint)" } },
  { day: 12 },

  { day: 13 },
  { day: 14 },
  { day: 15, chip: { label: "Midterm", tint: "var(--kal-cat-red-tint)" } },
  { day: 16 },
  { day: 17 },
  { day: 18, chip: { label: "Lab Report", tint: "var(--kal-cat-indigo-tint)" } },
  { day: 19 },

  { day: 20 },
  { day: 21 },
  { day: 22, chip: { label: "Client Call", tint: "var(--kal-cat-teal-tint)" } },
  { day: 23 },
  { day: 24 },
  { day: 25, chip: { label: "Reading", tint: "var(--kal-cat-pink-tint)" } },
  { day: 26 },

  { day: 27 },
  { day: 28 },
  { day: 29, chip: { label: "Shift", tint: "var(--kal-cat-yellow-tint)" } },
  { day: 30 },
  null,
  null,
  null,
];

export default function CalendarMockup() {
  return (
    <div className="w-full max-w-[920px]">
      <div className="rounded-2xl border border-[var(--kal-border)] bg-[var(--kal-surface)] p-4 text-left shadow-[0_20px_48px_-24px_rgba(28,26,22,0.1)] min-[860px]:p-6">
        {/* Space filters */}
        <div className="mb-5 flex flex-wrap items-center gap-4 border-b border-[var(--kal-border)] pb-4">
          {SPACE_FILTERS.map((space) => (
            <div
              key={space.label}
              className={cn(
                "flex items-center gap-1.5 text-[13px]",
                space.active ? "font-semibold text-[var(--kal-ink)]" : "font-medium text-[var(--kal-muted)]"
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: space.dotColor }}
                aria-hidden
              />
              {space.label}
            </div>
          ))}
        </div>

        {/* Month header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold text-[var(--kal-ink)]">September 2026</span>
        </div>

        {/* Weekday labels */}
        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="rounded-full bg-[#f4f1ea] py-1.5 text-center text-[9px] font-semibold tracking-wide text-[var(--kal-muted)] min-[640px]:text-[11px]"
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-2">
          {CALENDAR_CELLS.map((cell, i) =>
            cell === null ? (
              <div key={i} className="min-h-[58px] rounded-[9px] min-[640px]:min-h-[84px] min-[640px]:rounded-[10px]" />
            ) : (
              <div
                key={cell.day}
                className={cn(
                  "flex min-h-[58px] flex-col gap-1 rounded-[9px] border border-[var(--kal-border)] bg-[#fcfbf8] p-[5px] min-[640px]:min-h-[84px] min-[640px]:gap-1.5 min-[640px]:rounded-[10px] min-[640px]:p-2",
                  cell.today &&
                    "border-[var(--kal-accent)] bg-[#fff7ed] shadow-[0_0_0_2px_rgba(249,115,22,0.22)]"
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-medium text-[var(--kal-ink)]",
                    cell.today && "font-bold text-[var(--kal-accent-hover)]"
                  )}
                >
                  {cell.day}
                </span>
                {cell.chip && (
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-[6px] px-1 py-1 text-[10px] font-semibold whitespace-nowrap text-[#292524] min-[640px]:justify-start min-[640px]:px-1.5"
                    style={{ background: cell.chip.tint }}
                  >
                    <span className="hidden overflow-hidden text-ellipsis min-[640px]:inline">
                      {cell.chip.label}
                    </span>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
