# src/components

Flat directory of app components, plus `ui/` for shadcn primitives (`button`, `dialog`, `popover`) and `landing/` for the public marketing page (`src/app/(marketing)/page.tsx`). Add `ui/` primitives via the shadcn CLI rather than hand-writing them; `components.json` maps the aliases.

`landing/` components use their own `--kal-*` color tokens (`globals.css`) instead of the app's theme tokens — the marketing page is a deliberately separate design system, not themed like the rest of the app.

- **React Compiler is on.** Write plain component code. Don't add `useMemo`/`useCallback` micro-optimizations that fight the compiler.
- Interactive components start with `"use client"`. The app's server entry is `src/app/(app)/app/page.tsx`.
- Styling is Tailwind v4 with the daisyUI `business` theme, composed via `cn()` from `@/lib/utils`.

## Data flow

`Calendar.tsx` is the state owner: it fetches events, tasks, and categories, holds the current date and view, and passes data plus mutation callbacks down to the grids (`MonthGrid`, `WeekGrid`, `DayGrid`), the sidebar, and `EventModal`. New calendar data belongs in that fetch/state layer, not in a leaf component fetching for itself.

## Wire types

`@/lib/calendar-types` exports `CalendarEvent`, `CalendarTask`, and `CalendarCategory`: the JSON shapes returned by the API, where dates are ISO **strings**, not the `Date` objects the Drizzle `Event`/`Task` types declare server-side. Import these from `@/lib/calendar-types` in components and layout helpers instead of the DB types.

## Colors

Never build Tailwind classes by interpolation (`bg-${color}-500`); the scanner won't see them. Look colors up in `EVENT_COLOR_CLASSES` / `TASK_COLOR_CLASSES` in `@/lib/event-colors`, and add new colors to `EVENT_COLORS` there so the picker and the grids stay in sync.

## Geometry

Positioning math for the week/day time grid (overlap columns, percentage top/height, multi-day detection) lives in `@/lib/time-grid-layout`, not inline in the grid components.
