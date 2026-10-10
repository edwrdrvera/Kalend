"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLOR_SWATCH_CLASSES, getEventColorClasses, type EventColor } from "@/lib/event-colors";
import { spaceAbbreviation } from "@/lib/space-abbreviation";
import { buttonVariants } from "@/components/ui/button";
import { QUIET_LINK_CLS } from "@/components/control-styles";
import KalendMark from "@/components/KalendMark";
import CalendarWeekdayLabel from "@/components/CalendarWeekdayLabel";
import SpaceDot from "@/components/SpaceDot";
import TaskCheckbox from "@/components/TaskCheckbox";

// A static copy of the app's week view, drawn with the same classes as IconRail,
// AgendaColumn, MiniCalendar, CalendarHeader, WeekGrid, AllDayRow and TimeGrid.
// The week is Sun Sep 6 to Sat Sep 12, 2026, and Wednesday is today and selected.
// On wide screens the whole app is drawn at a fixed size and scaled down to fit,
// the way a screenshot would be. Narrower screens get the grid alone, unscaled.

const SPACES = {
  bio: { name: "BIO 102", color: "blue" },
  math: { name: "MATH 201", color: "indigo" },
  cafe: { name: "Campus café", color: "orange" },
  design: { name: "Design project", color: "purple" },
} as const satisfies Record<string, { name: string; color: EventColor }>;
type SpaceKey = keyof typeof SPACES;

const DAYS = [
  { label: "Sun", initial: "S", date: 6 },
  { label: "Mon", initial: "M", date: 7 },
  { label: "Tue", initial: "T", date: 8 },
  { label: "Wed", initial: "W", date: 9 },
  { label: "Thu", initial: "T", date: 10 },
  { label: "Fri", initial: "F", date: 11 },
  { label: "Sat", initial: "S", date: 12 },
] as const;
const TODAY = 3;

type Clock = readonly [hour: number, minute: number];
interface MockEvent {
  day: number;
  start: Clock;
  end: Clock;
  title: string;
  space: SpaceKey;
  group?: string;
  location?: string;
}

const EVENTS: MockEvent[] = [
  { day: 1, start: [10, 0], end: [11, 15], title: "Calculus II", space: "math", location: "Hall B" },
  { day: 1, start: [13, 0], end: [14, 30], title: "Study group", space: "bio" },
  { day: 2, start: [9, 0], end: [10, 15], title: "Biology lecture", space: "bio", group: "Lectures" },
  { day: 2, start: [11, 0], end: [13, 0], title: "Biology lab", space: "bio", location: "Science 204" },
  { day: 2, start: [14, 0], end: [15, 30], title: "Design critique", space: "design", group: "Studio" },
  { day: 3, start: [9, 0], end: [10, 15], title: "Biology lecture", space: "bio", group: "Lectures" },
  { day: 3, start: [11, 0], end: [12, 15], title: "Calculus II", space: "math", location: "Hall B" },
  { day: 3, start: [14, 0], end: [15, 0], title: "Design critique", space: "design", group: "Studio" },
  { day: 4, start: [10, 0], end: [11, 30], title: "Project kickoff", space: "design", location: "Studio 3" },
  { day: 4, start: [13, 0], end: [14, 0], title: "Office hours", space: "math" },
  { day: 4, start: [16, 0], end: [20, 0], title: "Café shift", space: "cafe" },
  { day: 5, start: [10, 0], end: [11, 15], title: "Calculus II", space: "math", location: "Hall B" },
  { day: 5, start: [13, 0], end: [17, 0], title: "Café shift", space: "cafe" },
  { day: 6, start: [10, 0], end: [14, 0], title: "Café shift", space: "cafe" },
];

interface MockTask {
  /** Day of the week it is due, or null when it is due outside this week or has no date. */
  day: number | null;
  /** Due label for a task due outside this week. */
  due?: string;
  title: string;
  space: SpaceKey;
  group?: string;
  done?: boolean;
}

const TASKS: MockTask[] = [
  { day: 1, title: "Read chapter 4", space: "bio", done: true },
  { day: 3, title: "Problem set 5", space: "math", group: "Homework" },
  { day: 4, title: "Draft case study", space: "design" },
  { day: 5, title: "Finish lab report", space: "bio" },
  { day: 2, title: "Return library books", space: "bio", done: true },
  { day: null, due: "Sep 21", title: "Midterm study guide", space: "math" },
  { day: null, due: "Sep 28", title: "Submit portfolio draft", space: "design" },
  { day: null, title: "Plan summer shifts", space: "cafe" },
];

const ALL_DAY_EVENTS = [{ title: "Design sprint", space: "design" as SpaceKey, startCol: 5, endCol: 6 }];

const DESIGN_WIDTH = 1520;
const DESIGN_HEIGHT = 840;
const FULL_MIN_WIDTH = 900;
const HOUR_HEIGHT_PX = 64;
const FIRST_HOUR = 8;
const HOURS = Array.from({ length: 10 }, (_, i) => FIRST_HOUR + i);
const LANE_HEIGHT_PX = 28;
const NOW: Clock = [10, 40];

const MINI_CALENDAR_WEEKS: { date: number; outside?: boolean }[][] = [
  [30, 31, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
  [27, 28, 29, 30, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
].map((week, weekIndex) =>
  week.map((date) => ({ date, outside: (weekIndex === 0 && date > 7) || (weekIndex >= 4 && date < 15) }))
);
const SELECTED_DATE = 9;

function minutes([hour, minute]: Clock): number {
  return hour * 60 + minute;
}

function offsetPx(time: Clock): number {
  return ((minutes(time) - FIRST_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
}

function clock([hour, minute]: Clock): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}

function pathOf(space: SpaceKey, group?: string): string {
  return [SPACES[space].name, group].filter(Boolean).join(" · ");
}

const TODAY_EVENTS = EVENTS.filter((event) => event.day === TODAY);
const TODAY_TASKS = TASKS.filter((task) => task.day === TODAY);

const WEEK_LOAD = DAYS.map((_, index) =>
  EVENTS.filter((event) => event.day === index).reduce((hours, event) => hours + (minutes(event.end) - minutes(event.start)) / 60, 0)
);

function dueLabel(task: MockTask): string {
  if (task.day === TODAY) return "Due today";
  if (task.day !== null) return `Sep ${DAYS[task.day].date}`;
  return task.due ?? "No date";
}

const OPEN_TASKS = TASKS.filter((task) => !task.done);
const PANEL_BUCKETS = [
  { label: "Today", tasks: OPEN_TASKS.filter((task) => task.day === TODAY) },
  { label: "This week", tasks: OPEN_TASKS.filter((task) => task.day !== null && task.day > TODAY) },
  { label: "Later", tasks: OPEN_TASKS.filter((task) => task.day === null && task.due) },
  { label: "No date", tasks: OPEN_TASKS.filter((task) => task.day === null && !task.due) },
].filter((bucket) => bucket.tasks.length > 0);
const COMPLETED_COUNT = TASKS.length - OPEN_TASKS.length;

export default function CalendarMockup() {
  const fitRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const full = width === null || width >= FULL_MIN_WIDTH;
  const scale = width === null ? 0.72 : Math.min(1, width / DESIGN_WIDTH);

  return (
    <figure className="relative isolate w-full max-w-[1180px] px-3 py-7 min-[640px]:px-9 min-[640px]:py-10">
      <span
        className="pointer-events-none absolute top-0 left-0 h-40 w-48 opacity-35"
        style={{ backgroundImage: "linear-gradient(var(--kal-cat-blue) 1px, transparent 1px), linear-gradient(90deg, var(--kal-cat-blue) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 bottom-2 h-36 w-44 opacity-30"
        style={{ backgroundImage: "linear-gradient(var(--kal-cat-blue) 1px, transparent 1px), linear-gradient(90deg, var(--kal-cat-blue) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-3 left-0 h-28 w-48 -rotate-6 bg-[var(--kal-tile-mustard)]/35"
        style={{ clipPath: "polygon(0 9%, 89% 0, 100% 78%, 18% 100%)" }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-24 -right-2 h-36 w-32 rotate-6 bg-[var(--kal-cat-indigo)]/20"
        style={{ clipPath: "polygon(14% 0, 100% 12%, 86% 100%, 0 84%)" }}
        aria-hidden
      />

      <div ref={fitRef} className="relative z-10 w-full">
        {full ? (
          <div className="relative" style={{ height: DESIGN_HEIGHT * scale }}>
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, transform: `scale(${scale})` }}
            >
              <AppFrame full />
            </div>
          </div>
        ) : (
          <AppFrame full={false} />
        )}
      </div>
      <figcaption className="relative z-10 mt-3 text-center text-[12px] text-[var(--kal-muted)]">
        Tasks and events, together in a real Kalend week.
      </figcaption>
    </figure>
  );
}

function AppFrame({ full }: { full: boolean }) {
  return (
    <div
      inert
      className={cn(
        "flex w-full overflow-hidden rounded-[24px] border border-border bg-card text-left text-foreground shadow-[0_28px_65px_-28px_color-mix(in_srgb,var(--kal-tile-ink)_30%,transparent)]",
        full ? "h-full" : "h-[600px]"
      )}
    >
      {full && (
        <div className="flex h-full shrink-0">
          <IconRailMock />
          <div className="flex h-full w-[272px] flex-col border-r border-border">
            <div className="min-h-0 flex-1 overflow-hidden">
              <AgendaColumnMock />
            </div>
            <MiniCalendarMock />
          </div>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <CalendarHeaderMock />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WeekDaysHeaderMock />
          <AllDayRowMock />
          <TimeGridMock />
        </div>
      </div>

      {full && (
        <div className="h-full w-[360px] shrink-0">
          <AllTasksPanelMock />
        </div>
      )}
    </div>
  );
}

function IconRailMock() {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-card pb-3.5 pt-4">
      <span className="grid size-[30px] place-items-center rounded-[10px] bg-primary">
        <KalendMark size={18} tone="white" />
      </span>
      <span className="my-[11px] h-px w-6 shrink-0 bg-border" />
      <span className="mb-[9px] grid size-[30px] place-items-center rounded-[10px] text-muted-foreground ring-2 ring-primary/35 ring-offset-2 ring-offset-card">
        <Layers className="size-4" />
      </span>
      <div className="flex flex-col items-center gap-[5px]">
        {Object.values(SPACES).map((space) => (
          <span
            key={space.name}
            className="relative grid size-[34px] place-items-center rounded-[10px] border-[1.5px] border-transparent bg-muted text-sm font-semibold text-muted-foreground"
          >
            {spaceAbbreviation(space.name)}
            <SpaceDot color={space.color} className="absolute right-[3px] bottom-[3px]" />
          </span>
        ))}
      </div>
      <span className="mt-[5px] grid size-[34px] place-items-center rounded-[10px] border border-dashed border-border text-muted-foreground">
        <Plus className="size-4" />
      </span>
      <div className="flex-1" />
      <span className="grid size-[30px] place-items-center rounded-full bg-muted text-body font-semibold text-muted-foreground">
        E
      </span>
    </nav>
  );
}

function AgendaColumnMock() {
  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="shrink-0 px-4 pt-4 pb-2.5">
        <h2 className="text-title font-semibold leading-tight tracking-[-0.02em] text-foreground">
          Today · Wed Sep 9
        </h2>
        <p className="mt-0.5 text-xs leading-normal text-muted-foreground">
          {TODAY_EVENTS.length} events, {TODAY_TASKS.filter((task) => !task.done).length} due · all spaces
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-3">
        <div className="flex flex-col">
          {TODAY_EVENTS.map((event) => (
            <div key={`${event.title}-${event.start[0]}`} className="flex items-start gap-1">
              <div className="-mx-1.5 flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-1.5 py-[7px] text-left">
                <span className="w-14 shrink-0 whitespace-nowrap text-body tabular-nums text-muted-foreground">
                  {clock(event.start)}
                </span>
                <span
                  aria-hidden
                  className={cn("mt-1 size-[9px] shrink-0 rounded-[3px]", EVENT_COLOR_SWATCH_CLASSES[SPACES[event.space].color])}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-foreground">{event.title}</span>
                  <span className="block truncate text-xs leading-normal text-muted-foreground">
                    {pathOf(event.space, event.group)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCalendarMock() {
  return (
    <div className="shrink-0 border-t border-border bg-[var(--mini-cal-bg)] px-3 pt-3 pb-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs leading-normal font-semibold tracking-[-0.02em] text-foreground">September 2026</h2>
        <div className="flex gap-1 text-muted-foreground">
          <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronLeft size={16} />
          </span>
          <span className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
      <div className="mb-2 flex w-full justify-between">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={index} className="w-7 text-center text-meta font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        {MINI_CALENDAR_WEEKS.map((week) => (
          <div key={week[0].date + (week[0].outside ? "o" : "")} className="mb-1 flex w-full justify-between">
            {week.map(({ date, outside }) => (
              <span
                key={`${date}-${outside ? "o" : "i"}`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-xs leading-normal font-medium",
                  outside
                    ? "text-muted-foreground"
                    : date === SELECTED_DATE
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-foreground"
                )}
              >
                {date}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarHeaderMock() {
  return (
    <div className="flex h-[53px] shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-1.5">
        <span className={buttonVariants({ variant: "outline", size: "icon-lg" })}>
          <ChevronLeft size={17} />
        </span>
        <span className={cn(buttonVariants({ variant: "outline", size: "lg" }), "hidden text-xs font-semibold min-[520px]:inline-flex")}>
          Today
        </span>
        <span className={buttonVariants({ variant: "outline", size: "icon-lg" })}>
          <ChevronRight size={17} />
        </span>
      </div>
      <h1 className="min-w-0 truncate text-base font-bold tracking-[-0.02em] [word-spacing:0.06em] text-foreground min-[900px]:text-xl">
        September 2026
      </h1>
      <div className="ml-auto hidden min-[520px]:block">
        <div className="inline-flex items-center rounded-lg bg-muted p-0.5 text-muted-foreground">
          {(["Week", "Month", "Day"] as const).map((label) => (
            <span
              key={label}
              className={cn(
                "inline-flex h-7 items-center justify-center rounded-md border border-transparent px-2.5 text-xs whitespace-nowrap",
                label === "Week"
                  ? "bg-background font-semibold text-foreground ring-1 ring-foreground/10 dark:bg-foreground/10"
                  : "font-medium text-foreground/60 dark:text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekDaysHeaderMock() {
  return (
    <div className="flex h-14 shrink-0 border-b border-border bg-card sm:h-[74px]">
      <div className="w-10 shrink-0 sm:w-16" />
      <div className="grid flex-1 grid-cols-7">
        {DAYS.map((day, index) => (
          <div key={day.date} className="flex flex-col items-start justify-center gap-0.5 pl-1 sm:pl-4 lg:pl-5">
            <CalendarWeekdayLabel className="hidden w-9 text-center sm:block">{day.label}</CalendarWeekdayLabel>
            <CalendarWeekdayLabel className="block w-6 text-center sm:hidden">{day.initial}</CalendarWeekdayLabel>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-sm font-bold tracking-[-0.03em] sm:size-9 sm:text-lg",
                index === TODAY ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              {day.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllDayRowMock() {
  return (
    <div className="flex min-h-[50px] shrink-0 border-b border-border bg-card">
      <div className="flex w-10 shrink-0 items-start justify-end border-r border-border pr-1 pt-4 sm:w-16 sm:pr-3">
        <span className="text-meta leading-none text-muted-foreground sm:text-xs">all-day</span>
      </div>
      <div className="relative flex flex-1 flex-col py-1">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-7 divide-x divide-border">
          {DAYS.map((day) => (
            <span key={day.date} />
          ))}
        </div>
        <div
          className="relative grid grid-cols-7"
          style={{ gridTemplateRows: `repeat(${ALL_DAY_EVENTS.length}, ${LANE_HEIGHT_PX}px)` }}
        >
          {ALL_DAY_EVENTS.map((event) => (
            <span
              key={event.title}
              style={{ gridColumn: `${event.startCol + 1} / ${event.endCol + 2}`, gridRow: 1 }}
              className={cn(
                "mx-1.5 my-0.5 overflow-hidden truncate rounded-md border px-2 py-0.5 text-left text-meta font-semibold",
                getEventColorClasses(SPACES[event.space].color)
              )}
            >
              {event.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeGridMock() {
  const gridHeight = HOURS.length * HOUR_HEIGHT_PX;
  const nowTop = offsetPx(NOW);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="relative w-10 shrink-0 border-r border-border sm:w-16">
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: HOUR_HEIGHT_PX }}
            className="pr-1.5 text-right text-[10px] text-muted-foreground sm:pr-3 sm:text-meta"
          >
            <span className="relative -top-2 block truncate">{hourLabel(hour)}</span>
          </div>
        ))}
        <div
          className="absolute right-1 z-10 -translate-y-1/2 rounded bg-now-label px-1 py-px text-[9px] font-semibold text-white tabular-nums sm:right-1.5 sm:text-[10px]"
          style={{ top: nowTop }}
        >
          {NOW[0] % 12 || 12}:{String(NOW[1]).padStart(2, "0")}
        </div>
      </div>
      <div className="relative grid flex-1 grid-cols-7 divide-x divide-border border-r border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 h-px -translate-y-1/2 bg-now/50"
          style={{ top: nowTop }}
        />
        {DAYS.map((day, index) => {
          const weekend = index === 0 || index === 6;
          return (
            <div
              key={day.date}
              className={cn(
                "relative border-r border-border last:border-r-0",
                index === TODAY ? "bg-primary/5" : weekend ? "bg-muted/30" : "bg-card"
              )}
              style={{ height: gridHeight }}
            >
              {HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT_PX }} className="border-b border-border/40" />
              ))}
              {index === TODAY && (
                <div className="pointer-events-none absolute inset-x-0 z-10 flex -translate-y-1/2 items-center" style={{ top: nowTop }}>
                  <div className="h-2 w-2 shrink-0 rounded-full bg-now" />
                  <div className="h-[2px] flex-1 bg-now" />
                </div>
              )}
              {EVENTS.filter((event) => event.day === index).map((event) => (
                <EventBlockMock key={`${event.title}-${event.start[0]}`} event={event} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBlockMock({ event }: { event: MockEvent }) {
  const space = SPACES[event.space];
  const top = offsetPx(event.start);
  const height = ((minutes(event.end) - minutes(event.start)) / 60) * HOUR_HEIGHT_PX;
  // Matches TimeGrid: the location line needs a block at least 45 minutes tall.
  const showLocation = Boolean(event.location) && height >= (45 / 1440) * 24 * HOUR_HEIGHT_PX;

  return (
    <div
      className={cn("absolute overflow-hidden rounded-sm border text-left text-xs font-semibold", getEventColorClasses(space.color))}
      style={{ top, height, left: 5, width: "calc(100% - 10px)" }}
    >
      <span
        aria-hidden
        className={cn("absolute left-1 top-1 bottom-1 w-[3px] rounded-full", EVENT_COLOR_SWATCH_CLASSES[space.color])}
      />
      <span className="absolute left-[13px] right-1.5 top-0.5 truncate">{event.title}</span>
      <span className="absolute left-[13px] right-1.5 top-5 truncate text-meta font-medium">
        {clock(event.start)} – {clock(event.end)}
      </span>
      {showLocation && (
        <span className="absolute left-[13px] right-1.5 top-9 truncate text-meta font-medium">{event.location}</span>
      )}
    </div>
  );
}

function AllTasksPanelMock() {
  const total = WEEK_LOAD.reduce((sum, hours) => sum + hours, 0);
  const max = Math.max(1, ...WEEK_LOAD);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-card">
      <header className="border-b border-border px-4 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-title font-semibold tracking-tight text-foreground">All tasks</h2>
          <span className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "text-muted-foreground")}>
            <X className="size-4" />
          </span>
        </div>
        <div className="mt-2 inline-flex h-8 items-center gap-1 p-[3px]">
          <span className="relative inline-flex h-[calc(100%-1px)] items-center rounded-md px-1.5 py-0.5 text-body font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground">
            Tasks
          </span>
          <span className="inline-flex h-[calc(100%-1px)] items-center rounded-md px-1.5 py-0.5 text-body font-semibold text-foreground/60 dark:text-muted-foreground">
            Alerts
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 divide-y divide-border overflow-hidden">
        <section className="px-4 py-3">
          <div className="flex items-baseline justify-between">
            <h3 className="label-caps">This week</h3>
            <span className="truncate pl-3 text-xs leading-normal text-muted-foreground">
              {round1(total)}h booked in all spaces
            </span>
          </div>
          <ul className="mt-1.5 flex gap-1">
            {DAYS.map((day, index) => {
              const hours = WEEK_LOAD[index];
              const today = index === TODAY;
              return (
                <li key={day.date} className="flex flex-1">
                  <span
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-auto flex-1 flex-col gap-1 px-0 pb-1.5 pt-1.5 font-normal",
                      today && "bg-primary/10"
                    )}
                  >
                    <span className="text-meta tabular-nums text-muted-foreground">{round1(hours)}h</span>
                    <span className="flex h-9 items-end">
                      <span
                        style={{ height: Math.max(3, Math.round((hours / max) * 36)) }}
                        className={cn("w-3.5 rounded-[3px]", today ? "bg-primary" : "bg-muted-foreground/50 opacity-60")}
                      />
                    </span>
                    <span className={cn("text-meta", today ? "font-semibold text-primary-text" : "text-muted-foreground")}>
                      {day.initial}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="label-caps">
              Tasks
              <span className="font-normal"> · {OPEN_TASKS.length} open</span>
            </h3>
            <span className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}>
              <Plus className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex flex-col">
            {PANEL_BUCKETS.map((bucket) => (
              <div key={bucket.label}>
                <h4 className="mb-0.5 mt-3 text-xs leading-normal font-semibold text-foreground">
                  {bucket.label}
                  <span className="ml-1.5 font-normal text-muted-foreground">{bucket.tasks.length}</span>
                </h4>
                {bucket.tasks.map((task) => (
                  <div key={task.title} className="-mx-4 border-b border-border/60 px-4 py-1.5 last:border-b-0">
                    <div className="flex items-start gap-2.5">
                      <TaskCheckbox title={task.title} checked={false} onToggle={noop} className="mt-0.5" />
                      <span className="-my-0.5 min-w-0 flex-1 px-1.5 py-0.5 text-left">
                        <span className="block truncate text-body text-foreground">{task.title}</span>
                        <span className="block truncate text-xs leading-normal text-muted-foreground">
                          {pathOf(task.space, task.group)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap text-xs leading-normal tabular-nums",
                          task.day === TODAY ? "text-warning" : "text-muted-foreground"
                        )}
                      >
                        {dueLabel(task)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <span className={cn(buttonVariants({ variant: "link" }), QUIET_LINK_CLS, "mt-3 inline-flex")}>
            Show completed ({COMPLETED_COUNT})
          </span>
        </section>
      </div>
    </div>
  );
}

function noop() {}
