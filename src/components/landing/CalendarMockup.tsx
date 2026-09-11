const DAYS = [
  { label: "Sun", date: 7, selected: false },
  { label: "Mon", date: 8, selected: true },
  { label: "Tue", date: 9, selected: false },
  { label: "Wed", date: 10, selected: false },
  { label: "Thu", date: 11, selected: false },
  { label: "Fri", date: 12, selected: false },
  { label: "Sat", date: 13, selected: false },
] as const;

const SCHOOL_SPACES = [
  { label: "Calculus II", color: "#6366f1" },
  { label: "Physics I", color: "#3b82f6" },
  { label: "English Literature", color: "#22a95b" },
  { label: "Psychology", color: "#a855f7" },
  { label: "Computer Science", color: "#f97316" },
] as const;

const MINI_CALENDAR_DAYS = [
  31, 1, 2, 3, 4, 5, 6,
  7, 8, 9, 10, 11, 12, 13,
  14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 1, 2, 3, 4,
] as const;

const EVENTS = [
  { day: 1, top: 82, height: 44, title: "Calculus II", time: "10:00 – 11:00", color: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  { day: 1, top: 158, height: 108, title: "Work shift", time: "12:00 – 3:00", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { day: 1, top: 344, height: 58, title: "English Lit", time: "5:00 – 6:30", color: "border-green-300 bg-green-50 text-green-700" },
  { day: 2, top: 6, height: 52, title: "Physics I", time: "8:00 – 9:15", color: "border-blue-300 bg-blue-100 text-blue-700" },
  { day: 2, top: 82, height: 44, title: "Team meeting", time: "10:00 – 11:00", color: "border-orange-300 bg-white text-orange-700" },
  { day: 2, top: 196, height: 50, title: "Psychology", time: "1:00 – 2:15", color: "border-purple-300 bg-purple-100 text-purple-700" },
  { day: 2, top: 272, height: 52, title: "Study group", time: "3:00 – 4:00", color: "border-blue-400 bg-white text-blue-700" },
  { day: 3, top: 44, height: 52, title: "Calculus II", time: "9:00 – 10:15", color: "border-indigo-400 bg-indigo-500 text-white", dragging: true },
  { day: 3, top: 120, height: 84, title: "Physics lab", time: "11:00 – 1:00", color: "border-blue-300 bg-blue-100 text-blue-700" },
  { day: 3, top: 234, height: 150, title: "Work shift", time: "2:00 – 6:00", color: "border-orange-300 bg-orange-50 text-orange-700" },
  { day: 4, top: 82, height: 52, title: "English Lit", time: "10:00 – 11:15", color: "border-green-300 bg-green-100 text-green-700" },
  { day: 4, top: 196, height: 50, title: "Psychology", time: "1:00 – 2:15", color: "border-purple-300 bg-purple-100 text-purple-700" },
  { day: 4, top: 272, height: 76, title: "Project kickoff", time: "3:00 – 4:30", color: "border-orange-400 bg-white text-orange-700" },
  { day: 5, top: 6, height: 52, title: "Physics I", time: "8:00 – 9:15", color: "border-blue-300 bg-blue-100 text-blue-700" },
  { day: 5, top: 82, height: 44, title: "Calculus II", time: "10:00 – 11:00", color: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  { day: 5, top: 158, height: 58, title: "English Lit", time: "12:00 – 1:15", color: "border-green-300 bg-green-50 text-green-700" },
  { day: 5, top: 310, height: 58, title: "Psychology", time: "4:00 – 5:15", color: "border-purple-300 bg-purple-100 text-purple-700" },
  { day: 6, top: 44, height: 160, title: "Work shift", time: "9:00 – 1:00", color: "border-orange-400 bg-orange-50 text-orange-700" },
  { day: 6, top: 234, height: 48, title: "Office hours", time: "2:00 – 3:00", color: "border-blue-400 bg-white text-blue-700" },
  { day: 6, top: 292, height: 54, title: "Writing center", time: "3:30 – 4:30", color: "border-green-400 bg-white text-green-700" },
] as const;

const ALL_DAY_TASKS = [
  { title: "Read chapter 4", color: "border-stone-200 bg-stone-50 text-stone-600" },
  { title: "Problem set 2", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { title: "Lab report", color: "border-green-200 bg-green-50 text-green-700" },
  { title: "Essay draft", color: "border-purple-200 bg-purple-50 text-purple-700" },
  { title: "Study for quiz", color: "border-orange-200 bg-orange-50 text-orange-700" },
  { title: "Plan next week", color: "border-blue-200 bg-blue-50 text-blue-700" },
  { title: "Grocery run", color: "border-stone-200 bg-stone-50 text-stone-600" },
] as const;

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
            <strong className="ml-2 flex items-center gap-1.5 truncate text-sm tracking-[-0.02em] min-[700px]:text-lg">
              September
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
                <span className={day.selected ? "mt-1 grid size-7 place-items-center rounded-full bg-[#4f46e5] text-xs font-bold text-white" : "mt-1 text-sm font-bold"}>
                  {day.date}
                </span>
              </div>
            ))}
          </div>

          <div className="grid h-[44px] shrink-0 grid-cols-[42px_repeat(7,minmax(0,1fr))] border-b border-[var(--mock-line)]">
            <span className="self-center text-center text-[8px] text-[var(--mock-muted)]">all-day</span>
            {ALL_DAY_TASKS.map((task) => (
              <div key={task.title} className={`mx-1 my-2 flex min-w-0 items-center justify-start gap-1 overflow-hidden rounded-md border px-1 py-1 text-[7px] font-medium min-[520px]:gap-1.5 min-[520px]:px-1.5 min-[520px]:text-[8px] ${task.color}`}>
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
                  className={`absolute rounded-md border px-1.5 py-1 text-[8px] leading-tight min-[520px]:px-2 min-[520px]:text-[10px] ${"dragging" in event && event.dragging ? "z-20 overflow-visible shadow-[0_8px_16px_rgba(79,70,229,0.2)]" : "overflow-hidden"} ${event.color}`}
                  style={{
                    left: `calc((100% / 7) * ${event.day - 1} + 3px)`,
                    width: "calc(100% / 7 - 6px)",
                    top: event.top,
                    height: event.height,
                  }}
                >
                  <strong className="block truncate">{event.title}</strong>
                  <span className="mt-1 block truncate opacity-70">{event.time}</span>
                  {"dragging" in event && event.dragging && <DragHand />}
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
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[var(--mock-line)] bg-[var(--mock-sidebar)] transition-colors min-[900px]:flex">
      <div className="flex items-center justify-between px-5 pt-7 pb-5">
        <strong className="text-lg tracking-[-0.03em]">Spaces</strong>
        <span className="text-xl font-light text-[#6b6861]" aria-hidden>+</span>
      </div>

      <div className="px-5 text-[12px]">
        <div className="flex items-center gap-2.5 py-2 font-semibold">
          <span className="size-3 rounded-[4px] bg-indigo-500" aria-hidden />
          <span>Spaces</span>
          <span className="ml-auto text-[var(--mock-muted)]" aria-hidden>⌄</span>
        </div>
        <div className="ml-3 border-l border-[var(--mock-line)] pl-4">
          {SCHOOL_SPACES.map((space) => (
            <div key={space.label} className="flex items-center gap-2.5 py-2 text-[var(--mock-muted)]">
              <span className="size-2.5 rounded-[3px]" style={{ background: space.color }} aria-hidden />
              <span className="truncate">{space.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2.5 py-2 font-semibold">
          <span className="size-3 rounded-[4px] bg-orange-500" aria-hidden />
          <span>Work</span>
          <span className="ml-auto text-[var(--mock-muted)]" aria-hidden>⌄</span>
        </div>
        <div className="flex items-center gap-2.5 py-2 font-semibold">
          <span className="size-3 rounded-[4px] bg-purple-500" aria-hidden />
          <span>Personal</span>
          <span className="ml-auto text-[var(--mock-muted)]" aria-hidden>⌄</span>
        </div>
      </div>

      <div className="mx-4 mt-auto mb-4 rounded-[14px] border border-[var(--mock-line)] bg-[var(--mock-surface)] p-4 shadow-[0_8px_24px_-22px_rgba(28,26,22,0.3)]">
        <div className="mb-3 flex items-center text-[13px] font-semibold tracking-[-0.01em]">
          <span>September</span>
          <span className="ml-auto flex items-center gap-3 text-[var(--mock-muted)]" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="m8.5 3-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="m5.5 3 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="grid auto-rows-[25px] grid-cols-7 gap-y-1 text-center text-[10px] leading-none text-[var(--mock-muted)]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <span key={`${day}-${index}`} className="mx-auto grid size-6 place-items-center font-semibold">{day}</span>
          ))}
          {MINI_CALENDAR_DAYS.map((day, index) => {
            const muted = index === 0 || index > 30;
            const selected = day === 8 && index < 15;
            return (
              <span
                key={`${day}-${index}`}
                className={`mx-auto grid size-6 place-items-center ${selected ? "rounded-full bg-indigo-500 font-semibold text-white shadow-[0_3px_8px_rgba(99,102,241,0.3)]" : muted ? "opacity-40" : ""}`}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

    </aside>
  );
}
