# Kalend

Kalend is a fast, minimal calendar and task manager designed for students. Give every class, project, and job its own Space, then see all your events and tasks together in one calendar view.

**Live app: [kalend.space](https://kalend.space)**

---

## Features

### 📅 Calendar
- **Month, Week, and Day views** to see your schedule at the level of detail you need, with easy switching between them.
- **Today marker** so you always know where you are, plus a red line showing the current time in Week and Day views.
- **All-day and multi-day events** displayed in their own row at the top of Week and Day views.
- **Mini calendar** in the sidebar for quick date navigation.
- **Collapsible sidebar** that tucks away when you need more screen space.

### ✏️ Events
- **Drag to move** events to a different day or time.
- **Drag to resize** an event's edges to make it shorter or longer, snapping to 15-minute increments.
- **Clean editing modal** for creating and editing events with a title, time range, and color.

### ✅ Tasks
- **Task list** in the sidebar to create, complete, and delete tasks.
- **Optional due dates** that show up on the calendar alongside your events.

### 🗂️ Spaces
- **One Space per commitment** — give every class, project, and job its own Space to hold all its events and tasks.
- **Toggle visibility** to hide a Space's items when you want a cleaner view.
- **Color-coded** so you can tell at a glance what everything belongs to.
- **Space manager** in the sidebar to create, rename, recolor, and delete Spaces.

### 🔐 Account
- **Waitlist** on the landing page to register interest before the app opens publicly.
- **Log in** with a demo account to explore the full app.
- **Your data stays yours.** Everything you create is private to your account.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [daisyUI](https://daisyui.com/) |
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
├── drizzle/                     # SQL migrations and metadata snapshots
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/
│   │   │   ├── categories/      # Categories CRUD endpoints
│   │   │   ├── events/          # Events CRUD endpoints
│   │   │   ├── tasks/           # Tasks CRUD endpoints
│   │   │   ├── waitlist/        # Waitlist signup endpoint
│   │   │   ├── ping/            # Health check endpoint
│   │   │   └── test/            # Test endpoint
│   │   ├── (app)/               # Authenticated app shell
│   │   │   └── app/             # Main calendar page
│   │   ├── (marketing)/         # Public-facing pages
│   │   │   ├── login/           # Login page
│   │   │   └── page.tsx         # Landing page
│   │   └── globals.css          # Tailwind theme tokens
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── landing/             # Landing page sections and waitlist form
│   │   ├── Calendar.tsx         # Main calendar state manager
│   │   ├── CalendarHeader.tsx   # Header with view switcher and navigation
│   │   ├── CalendarSidebar.tsx  # Collapsible sidebar
│   │   ├── CalendarWeekdayLabel.tsx # Weekday column headers
│   │   ├── AgendaSummary.tsx    # Sidebar agenda summary panel
│   │   ├── MonthGrid.tsx        # Month view
│   │   ├── WeekGrid.tsx         # Week view
│   │   ├── DayGrid.tsx          # Day view
│   │   ├── TimeGrid.tsx         # Shared 24-hour grid with drag-move and drag-resize
│   │   ├── AllDayRow.tsx        # All-day and multi-day event lanes
│   │   ├── EventCreatePopover.tsx # Inline event creation popover
│   │   ├── TaskChip.tsx         # Task badge on calendar grids
│   │   ├── TaskDueRow.tsx       # Task due dates in the all-day row
│   │   ├── CategoryManager.tsx  # Sidebar category manager
│   │   ├── CategorySelect.tsx   # Category picker for forms
│   │   ├── ColorSwatchPicker.tsx # Color picker popover
│   │   ├── DateField.tsx        # Date input field
│   │   ├── MiniCalendar.tsx     # Sidebar mini month picker
│   │   ├── ThemeToggle.tsx      # Light/dark mode toggle
│   │   ├── ViewSwitcher.tsx     # Month/Week/Day toggle
│   │   ├── SettingsMenu.tsx     # Settings menu
│   │   ├── AuthCard.tsx         # Shared login card
│   │   ├── AuthCardShell.tsx    # Auth page layout shell
│   │   ├── KalendAppIcon.tsx    # App icon component
│   │   ├── KalendMark.tsx       # Logo mark component
│   │   └── KalendWordmark.tsx   # Logo wordmark component
│   ├── db/
│   │   ├── schema/
│   │   │   ├── events.ts        # Events table
│   │   │   ├── tasks.ts         # Tasks table
│   │   │   ├── categories.ts    # Categories table
│   │   │   ├── waitlist.ts      # Waitlist table
│   │   │   └── index.ts         # Schema barrel export
│   │   ├── seed.ts              # Sample data seed script
│   │   └── index.ts             # Database connection
│   ├── lib/
│   │   ├── __tests__/           # Unit and integration tests
│   │   ├── supabase/            # Supabase browser, server, and middleware clients
│   │   ├── api.ts               # Shared API fetch helpers
│   │   ├── auth-validation.ts   # Input validation
│   │   ├── calendar-types.ts    # Calendar-specific TypeScript types
│   │   ├── event-colors.ts      # Color palette helpers
│   │   ├── popover-position.ts  # Popover placement utilities
│   │   ├── theme.tsx            # Theme context and provider
│   │   ├── time-grid-layout.ts  # Event overlap layout math
│   │   └── utils.ts             # Shared utilities
│   └── middleware.ts            # Route protection middleware
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.1+ recommended)
- A [Supabase](https://supabase.com/) project (or local PostgreSQL database)

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

Restart `bun run dev` after changing `.env.local`; Next.js includes
`NEXT_PUBLIC_*` values in the browser bundle when the development server starts.

For Vercel deployments, add both Supabase variables to the **Production** and
**Preview** environments, then redeploy each affected deployment. Updating a
Vercel environment variable does not change a browser bundle that has already
been built.

### 4. Run Database Migrations
Apply the schema migrations to your PostgreSQL database:

```bash
bunx drizzle-kit migrate
```

*(Optional: Launch Drizzle Studio GUI)*:
```bash
bunx drizzle-kit studio
```

### 5. Start Development Server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Seed Sample Data (Optional)
Find your user id in the Supabase dashboard under **Authentication > Users** (or run `select id, email from auth.users;` in the SQL editor). Load the sample events from `src/db/data/data.csv` into your account:

```bash
SEED_USER_ID=<your-uuid> bun run db:seed
```

Safe to run more than once: rows already present (matched by title and start time) are skipped instead of duplicated.

---

## Development & Testing

### Run Automated Tests
```bash
bun test
```

### TypeScript Verification
```bash
bunx tsc --noEmit
```

### Linting
```bash
bun run ./node_modules/eslint/bin/eslint.js .
```

### Production Build
```bash
bun run build
```

### Vercel Deployment

Before exposing the public waitlist endpoint, configure its required Vercel
Firewall rule for both Production and Preview deployments. See
[`docs/vercel-deployment.md`](docs/vercel-deployment.md).

---

## Database & Migration Workflow

1. **Edit Schema**: Modify or add tables under `src/db/schema/` (e.g. `events.ts`, `tasks.ts`).
2. **Generate Migration**: Create offline SQL migration files:
   ```bash
   bunx drizzle-kit generate
   ```
3. **Apply Migration**: Apply SQL files to the database:
   ```bash
   bunx drizzle-kit migrate
   ```
4. **Commit**: Commit both the modified `src/db/schema/` file and the generated `drizzle/` SQL files together.

---

## License
MIT License.
