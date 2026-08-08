# Kalend

> A fast, minimal, and modern calendar and task planner designed for students and developers. Built with Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase Auth, and Drizzle ORM on PostgreSQL.

---

## Features

### 📅 Calendar Views & Layouts
- **Month Grid**: Clean 7×6 monthly calendar view with current-day and selected-day highlighting, out-of-month dimming, and overflow pills (`+N more`).
- **Week View**: 7-day column grid with day-name headers, today/selected day indicators, 24-hour time slots, and a live red current-time marker.
- **Day View**: Single-day timeline view sharing the same precise 24-hour time grid and navigation controls.
- **All-Day & Multi-Day Row**: Dedicated horizontal lane stacking for untimed and multi-day events across Day and Week views.
- **Collapsible Sidebar**: Smoothly animated sidebar toggle with an interactive mini month-picker that synchronizes with the main calendar view.

### ⚡ Direct Event Manipulation
- **Drag-to-Resize**: Grab the top or bottom handles of any event block in Week or Day view to dynamically adjust duration with 15-minute slot snapping and optimistic updates.
- **Drag-to-Move**: Drag entire event blocks across days and time slots with live preview, pointer thresholding, and click suppression.
- **Minimal Event Modal**: Borderless oversized title input, progressive disclosure time-range picker, popover color selector, and optimistic delete flows.

### 🔐 Authentication & Session Security
- **Supabase Auth**: Dedicated `/login` and `/signup` pages with dark-themed cards, client-side input validation, error handling, and loading spinners.
- **SSR Middleware**: Automatic session refresh via `@supabase/ssr` with route protection that keeps unauthorized visitors on `/login` and redirects authenticated users to the calendar.

### 🎨 Dark-First Design System
- Tailored dark palette (`#121212` background, `#191919` surface, `#262626` borders, `blue-600` primary accents) configured directly via CSS variables in `@theme`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Base-Nova) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) (`@supabase/ssr`, `@supabase/supabase-js`) |
| **Database & ORM** | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) + `postgres.js` |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) |
| **Testing** | Bun Test Runner (`bun:test`) |

---

## Architecture & Directory Structure

```text
Kalend/
├── drizzle/                     # Drizzle SQL migrations and metadata snapshots
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API Route Handlers
│   │   │   ├── events/          # Events CRUD endpoints (GET, POST, PATCH, DELETE)
│   │   │   ├── ping/            # Health check endpoint
│   │   │   └── test/            # Mock & echo testing endpoints
│   │   ├── login/               # /login page
│   │   ├── signup/              # /signup page
│   │   ├── globals.css          # Tailwind theme tokens and base layers
│   │   ├── layout.tsx           # Root dark layout and font configuration
│   │   └── page.tsx             # Root page rendering Calendar component
│   ├── components/              # React UI Components
│   │   ├── ui/                  # shadcn/ui primitives (button, dialog, input, label, popover)
│   │   ├── AllDayRow.tsx        # Multi-day and all-day horizontal event lanes
│   │   ├── AuthCard.tsx         # Reusable auth card for login and registration
│   │   ├── Calendar.tsx         # Main calendar state manager and event coordinator
│   │   ├── CalendarHeader.tsx   # Header bar with title, view switcher, and navigation
│   │   ├── CalendarSidebar.tsx  # Collapsible sidebar wrapper
│   │   ├── DayGrid.tsx          # Single-day calendar view
│   │   ├── EventModal.tsx       # Minimalist create/edit/delete event modal
│   │   ├── MiniCalendar.tsx     # Sidebar mini month-picker
│   │   ├── MonthGrid.tsx        # Full monthly 7x6 day grid
│   │   ├── TimeGrid.tsx         # 24-hour hour grid with drag-move & drag-resize
│   │   └── ViewSwitcher.tsx     # Segmented control for Month, Week, and Day views
│   ├── db/                      # Database configuration and schema
│   │   ├── schema/
│   │   │   └── events.ts        # Drizzle events table definition and types
│   │   └── index.ts             # Postgres pooler connection with Drizzle client
│   ├── lib/                     # Utilities and helpers
│   │   ├── __tests__/           # Unit and integration test suites
│   │   ├── auth-validation.ts   # Client and form input validation
│   │   ├── event-colors.ts      # Event color palettes and Tailwind class maps
│   │   ├── time-grid-layout.ts  # Cluster packing, overlap splitting, and all-day math
│   │   ├── utils.ts             # shadcn cn() className merger
│   │   └── supabase/            # Supabase browser, server, and middleware clients
│   └── middleware.ts            # Root Next.js middleware for route protection
├── drizzle.config.ts            # Drizzle Kit configuration
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+ recommended)
- A [Supabase](https://supabase.com/) project (or local PostgreSQL instance)

### 1. Clone the Repository
```bash
git clone https://github.com/edwrdrvera/Kalend.git
cd Kalend
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your credentials:
```env
# Supabase Transaction Pooler (Port 6543)
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

### 4. Run Database Migrations
Apply the initial schema migrations to your PostgreSQL database:

```bash
bunx drizzle-kit migrate
```

*(Optional: Launch Drizzle Studio to inspect database records via GUI)*:
```bash
bunx drizzle-kit studio
```

### 5. Start Development Server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development & Testing

### Run Automated Tests
Kalend uses Bun's built-in fast test runner:

```bash
bun test
```

### TypeScript Type-Checking
Verify complete type safety across components, API routes, and test files:

```bash
bun run ./node_modules/typescript/bin/tsc --noEmit
```

### Linting
```bash
bun run ./node_modules/eslint/bin/eslint.js .
```

### Production Build
```bash
bun run build
```

---

## Database & Migration Workflow

When updating database schema definitions:

1. **Edit Schema**: Modify or add tables under `src/db/schema/` (e.g. `events.ts`).
2. **Generate Migration**: Create offline SQL migration files without connecting to the DB:
   ```bash
   bunx drizzle-kit generate
   ```
3. **Apply Migration**: Execute the SQL files against your database:
   ```bash
   bunx drizzle-kit migrate
   ```
4. **Commit**: Commit both the modified `src/db/schema/` file and the generated `drizzle/` SQL files together.

---

## License
MIT License.
