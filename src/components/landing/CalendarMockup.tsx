import { EVENT_COLOR_CLASSES, TASK_COLOR_CLASSES, EVENT_COLOR_SWATCH_CLASSES, type EventColor } from "@/lib/event-colors";
import KalendMark from "@/components/KalendMark";

// A dragged event is "picked up": a solid fill with white text instead of the
// usual soft tint, so it reads as the one you're moving. Uses the -deep token
// (not -solid) so white text clears WCAG AA. Only Calculus II drags in this
// mock, so this is a single literal class string Tailwind's scanner can see.
const DRAG_CLASS = "border-[var(--evt-indigo-deep)] bg-[var(--evt-indigo-deep)] text-white";

const DAYS = [
  { label: "Sun", date: 7, selected: false },
  { label: "Mon", date: 8, selected: true },
  { label: "Tue", date: 9, selected: false },
  { label: "Wed", date: 10, selected: false },
  { label: "Thu", date: 11, selected: false },
  { label: "Fri", date: 12, selected: false },
  { label: "Sat", date: 13, selected: false },
] as const;

// The real sidebar is an icon rail + an agenda column (Schedule + Tasks) with a
// mini calendar pinned below — see CalendarSidebar / IconRail / AgendaColumn.
// These constants drive the static mock of that layout. Colors are EventColor
// keys (the app's "sunset warm" palette), rendered via the same
// EVENT_COLOR_* helpers the real sidebar uses so the mock can't drift.

// Rail space tiles: 2-letter abbreviations like the app's spaceAbbreviation().
const RAIL_SPACES: { abbr: string; color: EventColor; active?: boolean }[] = [
  { abbr: "Sc", color: "indigo", active: true },
  { abbr: "Wk", color: "orange" },
  { abbr: "Pe", color: "purple" },
  { abbr: "Ha", color: "green" },
];

// Agenda "Schedule" section: the selected day's timed events.
const SCHEDULE: { time: string; title: string; color: EventColor }[] = [
  { time: "9:00 AM", title: "Midterm Exam – Algorithms", color: "indigo" },
  { time: "12:00 PM", title: "Lunch with Edward", color: "orange" },
  { time: "1:00 PM", title: "Data Structures Lab", color: "blue" },
];

// Agenda "Tasks" section: the persistent to-do list, grouped into due-date
// buckets (mirrors AgendaTasksGroup's bucketing). Completed tasks show a filled
// checkbox + strikethrough; the header count is open tasks only (here: 4).
const TASK_BUCKETS: {
  label: string;
  tasks: { title: string; color: EventColor; done?: boolean }[];
}[] = [
  {
    label: "Today",
    tasks: [
      { title: "Line up a hackathon team", color: "indigo", done: true },
      { title: "Finish algorithms problem set", color: "blue", done: true },
    ],
  },
  {
    label: "This week",
    tasks: [
      { title: "Clear the code review backlog", color: "blue" },
      { title: "Draft the hackathon pitch", color: "orange" },
      { title: "Book a dentist follow-up", color: "green" },
      { title: "Prepare for the algorithms midterm", color: "purple" },
    ],
  },
];

const MINI_CALENDAR_DAYS = [
  31, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 1, 2, 3, 4,
] as const;

// Times carry am/pm on BOTH ends, matching the app's week/day event blocks
// (format "h:mm a – h:mm a", e.g. "10:00 AM – 11:00 AM").
const EVENTS: { day: number; top: number; height: number; title: string; time: string; color: EventColor; dragging?: boolean }[] = [
  { day: 1, top: 82, height: 44, title: "Calculus II", time: "10:00 AM – 11:00 AM", color: "indigo" },
  { day: 1, top: 158, height: 108, title: "Work shift", time: "12:00 PM – 3:00 PM", color: "orange" },
  { day: 1, top: 344, height: 58, title: "English Lit", time: "5:00 PM – 6:30 PM", color: "green" },
  { day: 2, top: 6, height: 52, title: "Physics I", time: "8:00 AM – 9:15 AM", color: "blue" },
  { day: 2, top: 82, height: 44, title: "Team meeting", time: "10:00 AM – 11:00 AM", color: "orange" },
  { day: 2, top: 196, height: 50, title: "Psychology", time: "1:00 PM – 2:15 PM", color: "purple" },
  { day: 2, top: 272, height: 52, title: "Study group", time: "3:00 PM – 4:00 PM", color: "blue" },
  { day: 3, top: 44, height: 52, title: "Calculus II", time: "9:00 AM – 10:15 AM", color: "indigo", dragging: true },
  { day: 3, top: 120, height: 84, title: "Physics lab", time: "11:00 AM – 1:00 PM", color: "blue" },
  { day: 3, top: 234, height: 150, title: "Work shift", time: "2:00 PM – 6:00 PM", color: "orange" },
  { day: 4, top: 82, height: 52, title: "English Lit", time: "10:00 AM – 11:15 AM", color: "green" },
  { day: 4, top: 196, height: 50, title: "Psychology", time: "1:00 PM – 2:15 PM", color: "purple" },
  { day: 4, top: 272, height: 76, title: "Project kickoff", time: "3:00 PM – 4:30 PM", color: "orange" },
  { day: 5, top: 6, height: 52, title: "Physics I", time: "8:00 AM – 9:15 AM", color: "blue" },
  { day: 5, top: 82, height: 44, title: "Calculus II", time: "10:00 AM – 11:00 AM", color: "indigo" },
  { day: 5, top: 158, height: 58, title: "English Lit", time: "12:00 PM – 1:15 PM", color: "green" },
  { day: 5, top: 310, height: 58, title: "Psychology", time: "4:00 PM – 5:15 PM", color: "purple" },
  { day: 6, top: 44, height: 160, title: "Work shift", time: "9:00 AM – 1:00 PM", color: "orange" },
  { day: 6, top: 234, height: 48, title: "Office hours", time: "2:00 PM – 3:00 PM", color: "blue" },
  { day: 6, top: 292, height: 54, title: "Writing center", time: "3:30 PM – 4:30 PM", color: "green" },
];

const ALL_DAY_TASKS: { title: string; color: EventColor }[] = [
  { title: "Read chapter 4", color: "indigo" },
  { title: "Problem set 2", color: "blue" },
  { title: "Lab report", color: "green" },
  { title: "Essay draft", color: "purple" },
  { title: "Study for quiz", color: "orange" },
  { title: "Plan next week", color: "blue" },
  { title: "Grocery run", color: "teal" },
];

const HOURS = ["8 am", "9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm"];

export default function CalendarMockup() {
  return (
    <figure className="relative isolate w-full max-w-[1180px] px-3 py-7 min-[640px]:px-9 min-[640px]:py-10">
      <span
        className="pointer-events-none absolute top-0 left-0 h-40 w-48 opacity-35"
        style={{ backgroundImage: "linear-gradient(#75aee0 1px, transparent 1px), linear-gradient(90deg, #75aee0 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 bottom-2 h-36 w-44 opacity-30"
        style={{ backgroundImage: "linear-gradient(#75aee0 1px, transparent 1px), linear-gradient(90deg, #75aee0 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-3 left-0 h-28 w-48 -rotate-6 bg-[#eadbbd]/65"
        style={{ clipPath: "polygon(0 9%, 89% 0, 100% 78%, 18% 100%)" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-24 -right-2 h-36 w-32 rotate-6 bg-[#dcd9f8]/65"
        style={{ clipPath: "polygon(14% 0, 100% 12%, 86% 100%, 0 84%)" }}
        aria-hidden
      />

      <div
        className="relative z-10 flex h-[560px] overflow-hidden rounded-[24px] border border-[var(--mock-line)] bg-[var(--mock-bg)] text-left text-[var(--mock-text)] shadow-[0_28px_65px_-28px_rgba(28,26,22,0.3)] transition-colors min-[1100px]:h-[640px]"
        style={{
          "--mock-bg": "#ffffff",
          "--mock-sidebar": "#fdfcf9",
          "--mock-surface": "#ffffff",
          "--mock-soft": "#f5f5f5",
          "--mock-line": "#e5e7eb",
          "--mock-text": "#1c1a16",
          "--mock-muted": "#756f61",
        } as React.CSSProperties}
      >
        <CalendarSidebarMockup />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[64px] items-center gap-2 border-b border-[var(--mock-line)] px-3 min-[700px]:px-4">
            <span className="grid size-8 place-items-center rounded-md border border-[var(--mock-line)] bg-[var(--mock-surface)] text-xs" aria-hidden>‹</span>
            <span className="grid h-8 place-items-center rounded-md border border-[var(--mock-line)] bg-[var(--mock-surface)] px-2.5 text-[11px] font-semibold">Today</span>
            <span className="grid size-8 place-items-center rounded-md border border-[var(--mock-line)] bg-[var(--mock-surface)] text-xs" aria-hidden>›</span>
            <strong className="ml-2 truncate text-sm tracking-[-0.02em] min-[700px]:text-lg">
              September
            </strong>
            <div className="ml-auto hidden rounded-lg bg-[var(--mock-soft)] p-1 text-[10px] min-[520px]:flex">
              <span className="rounded-md bg-[var(--mock-surface)] px-2 py-1 font-semibold shadow-sm">Week</span>
              <span className="px-2 py-1">Month</span>
              <span className="px-2 py-1">Agenda</span>
            </div>
          </div>

          <div className="grid h-[64px] shrink-0 grid-cols-[42px_repeat(7,minmax(0,1fr))] border-b border-[var(--mock-line)]">
            <span />
            {DAYS.map((day) => (
              <div key={day.date} className="flex flex-col items-start justify-center pl-1.5 min-[520px]:pl-2.5 min-[900px]:pl-4">
                <span className="text-[8px] font-semibold tracking-wide text-[var(--mock-muted)] uppercase min-[520px]:text-[10px]">{day.label}</span>
                <span className={day.selected ? "mt-1 grid size-7 place-items-center rounded-full bg-[var(--kal-accent)] text-xs font-bold text-white" : "mt-1 text-sm font-bold"}>
                  {day.date}
                </span>
              </div>
            ))}
          </div>

          <div className="grid h-[44px] shrink-0 grid-cols-[42px_repeat(7,minmax(0,1fr))] border-b border-[var(--mock-line)]">
            <span className="self-center text-center text-[8px] text-[var(--mock-muted)]">all-day</span>
            {ALL_DAY_TASKS.map((task) => (
              <div key={task.title} className={`mx-1 my-2 flex min-w-0 items-center justify-start gap-1 overflow-hidden rounded-md border px-1 py-1 text-[7px] font-medium min-[520px]:gap-1.5 min-[520px]:px-1.5 min-[520px]:text-[8px] ${TASK_COLOR_CLASSES[task.color]}`}>
                <span className="size-3 shrink-0 rounded-[3px] border border-current/50" aria-hidden />
                <span className="truncate">{task.title}</span>
              </div>
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="grid w-[42px] shrink-0 grid-rows-11 pt-1 text-center text-[8px] text-[var(--mock-muted)] min-[520px]:text-[9px]">
              {HOURS.map((time) => <span key={time}>{time}</span>)}
            </div>
            <div
              className="relative flex-1"
              style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 37px, var(--mock-line) 37px, var(--mock-line) 38px)" }}
            >
              <div className="absolute inset-0 grid grid-cols-7">
                {DAYS.map((day) => <span key={day.date} className="border-l border-[var(--mock-line)]" />)}
              </div>
              {EVENTS.map((event) => (
                <div
                  key={`${event.day}-${event.title}`}
                  className={`absolute rounded-md border px-1.5 py-1 text-[8px] leading-tight min-[520px]:px-2 min-[520px]:text-[10px] ${event.dragging ? `z-20 overflow-visible shadow-[0_8px_16px_rgba(63,82,160,0.28)] ${DRAG_CLASS}` : `overflow-hidden ${EVENT_COLOR_CLASSES[event.color]}`}`}
                  style={{
                    left: `calc((100% / 7) * ${event.day - 1} + 3px)`,
                    width: "calc(100% / 7 - 6px)",
                    top: event.top,
                    height: event.height,
                  }}
                >
                  {/* Floating inset accent bar hugging the left edge, matching
                      the app's week/day events. The dragged event is solid so
                      it needs no bar. */}
                  {!event.dragging && (
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-1 top-1 bottom-1 w-[2px] rounded-full ${EVENT_COLOR_SWATCH_CLASSES[event.color]}`}
                    />
                  )}
                  <strong className={`block truncate ${event.dragging ? "" : "pl-1.5"}`}>{event.title}</strong>
                  <span className={`mt-0.5 block truncate opacity-70 ${event.dragging ? "" : "pl-1.5"}`}>{event.time}</span>
                  {event.dragging && <DragHand />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="relative z-10 mt-3 text-center text-[12px] text-[var(--kal-muted)]">
        Tasks and events, together in a real Kalend week.
      </figcaption>
    </figure>
  );
}

function DragHand() {
  return (
    <svg
      className="absolute -right-2 -bottom-3 size-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M9.2 13.2V7.4a1.45 1.45 0 0 1 2.9 0v4.2-6.1a1.45 1.45 0 0 1 2.9 0v6.1-4.7a1.45 1.45 0 0 1 2.9 0v5.4-2.6a1.45 1.45 0 0 1 2.9 0v7.1c0 4.3-2.7 7.2-7 7.2h-.8a6.6 6.6 0 0 1-5.2-2.5l-4.1-5.2a1.6 1.6 0 0 1 2.4-2.1l3.1 3.1v-4.1Z"
        fill="white"
        stroke="#292524"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarSidebarMockup() {
  return (
    <aside className="hidden w-[256px] shrink-0 border-r border-[var(--mock-line)] bg-[var(--mock-sidebar)] transition-colors min-[900px]:flex">
      <RailMockup />
      <div className="flex min-w-0 flex-1 flex-col">
        <AgendaColumnMockup />
        <MiniCalendarMockup />
      </div>
    </aside>
  );
}

// Icon rail: app mark, "all spaces", Space tiles, add, account avatar.
function RailMockup() {
  return (
    <nav
      className="flex w-[46px] shrink-0 flex-col items-center border-r border-[var(--mock-line)] bg-[var(--mock-surface)] pt-3.5 pb-3"
      aria-hidden
    >
      <span className="grid size-7 place-items-center rounded-[8px] bg-[var(--kal-accent)]">
        <KalendMark size={15} tone="white" />
      </span>
      <div className="my-2.5 h-px w-5 bg-[var(--mock-line)]" />

      {/* View all spaces (stacked-layers glyph) */}
      <span className="mb-2 grid size-7 place-items-center rounded-[8px] text-[var(--mock-muted)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      </span>

      <div className="flex flex-col items-center gap-1.5">
        {RAIL_SPACES.map((space) => (
          <span
            key={space.abbr}
            className={
              space.active
                ? `grid size-7 place-items-center rounded-[9px] border text-[11px] font-bold ${EVENT_COLOR_CLASSES[space.color]}`
                : "grid size-7 place-items-center rounded-[9px] bg-[var(--mock-soft)] text-[11px] font-bold text-[var(--mock-muted)]"
            }
          >
            {space.abbr}
          </span>
        ))}
      </div>

      <span className="mt-1.5 grid size-7 place-items-center rounded-[9px] border border-dashed border-[var(--mock-line)] text-base font-light text-[var(--mock-muted)]">
        +
      </span>

      <div className="flex-1" />
      <span className="grid size-7 place-items-center rounded-full bg-[var(--mock-soft)] text-[9px] font-semibold text-[var(--mock-muted)]">
        AR
      </span>
    </nav>
  );
}

// Agenda column: date header, Schedule section, Tasks section (bucketed).
function AgendaColumnMockup() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--mock-line)] px-3.5 pt-3 pb-2.5">
        <h3 className="text-[13px] font-semibold leading-tight tracking-[-0.02em]">Monday, Sep 8</h3>
        <p className="mt-0.5 text-[10px] text-[var(--mock-muted)]">3 events · 4 tasks</p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
        {/* Schedule */}
        <section aria-hidden>
          <h4 className="px-1 pb-1 text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--mock-muted)]">Schedule</h4>
          <div className="flex flex-col">
            {SCHEDULE.map((event) => (
              <div key={event.title} className="flex items-center gap-2 rounded-sm px-1 py-1">
                <span className="w-[48px] shrink-0 whitespace-nowrap text-[10px] font-medium tabular-nums text-[var(--mock-muted)]">
                  {event.time}
                </span>
                <span className={`w-[2.5px] self-stretch rounded-full ${EVENT_COLOR_SWATCH_CLASSES[event.color]}`} />
                <span className="min-w-0 flex-1 truncate text-[11px]">{event.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tasks: one "+" for the whole list in the section header; buckets no
            longer carry their own "+". */}
        <section aria-hidden className="mt-3">
          <div className="flex items-center justify-between px-1 pb-1">
            <h4 className="text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--mock-muted)]">Tasks</h4>
            <span className="grid size-4 place-items-center rounded text-[var(--mock-muted)]">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 2.5v7M2.5 6h7" />
              </svg>
            </span>
          </div>
          {TASK_BUCKETS.map((bucket) => (
            <div key={bucket.label} className="mt-2 first:mt-0">
              <div className="flex items-center gap-1.5 px-1">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="text-[var(--mock-muted)]">
                  <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-medium text-[var(--mock-text)]/90">{bucket.label}</span>
                <span className="text-[10px] font-medium tabular-nums text-[var(--mock-muted)]">{bucket.tasks.length}</span>
              </div>
              <div className="mt-0.5 flex flex-col gap-1">
                {bucket.tasks.map((task) => (
                  <div key={task.title} className="flex items-center gap-2 rounded-sm px-1 py-1">
                    {task.done ? (
                      <span className="grid size-[13px] shrink-0 translate-y-[1px] place-items-center rounded-[4px] bg-[var(--kal-accent)] text-white">
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="m2.5 6 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span className="size-[13px] shrink-0 translate-y-[1px] rounded-[4px] border-[1.5px] border-[var(--mock-line)]" />
                    )}
                    {!task.done && (
                      <span className={`size-1.5 shrink-0 translate-y-[1px] rounded-full ${EVENT_COLOR_SWATCH_CLASSES[task.color]}`} />
                    )}
                    <span
                      className={
                        task.done
                          ? "min-w-0 flex-1 truncate text-[11px] text-[var(--mock-muted)] line-through"
                          : "min-w-0 flex-1 truncate text-[11px]"
                      }
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// Mini calendar pinned at the bottom of the agenda column.
function MiniCalendarMockup() {
  return (
    <div className="shrink-0 border-t border-[var(--mock-line)] px-3 pt-2.5 pb-3">
      <div className="mb-2 flex items-center text-[11px] font-semibold tracking-[-0.01em]">
        <span>September 2026</span>
        <span className="ml-auto flex items-center gap-2.5 text-[var(--mock-muted)]" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="m8.5 3-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="m5.5 3 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="grid auto-rows-[19px] grid-cols-7 gap-y-0.5 text-center text-[9px] leading-none text-[var(--mock-muted)]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <span key={`${day}-${index}`} className="mx-auto grid size-5 place-items-center font-semibold">{day}</span>
        ))}
        {MINI_CALENDAR_DAYS.map((day, index) => {
          const muted = index === 0 || index > 30;
          const selected = day === 8 && index < 15;
          return (
            <span
              key={`${day}-${index}`}
              className={`mx-auto grid size-5 place-items-center rounded-[5px] ${selected ? "bg-[var(--kal-accent)] font-semibold text-white" : muted ? "opacity-40" : ""}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
