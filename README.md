# Kalend

Kalend is a calendar and task manager for students. Give each class, project, and job its own Space, then see all of their events and tasks in one calendar.

**Live app: [kalend.space](https://kalend.space)**

## Features

### Calendar

- **Month, Week, and Day views.** Switch between them from the header.
- **Today marker.** Week and Day views also show a red line at the current time.
- **All-day and multi-day events** sit in their own row at the top of Week and Day views.
- **Mini calendar** in the sidebar jumps to any date.
- **Collapsible sidebar** gives the calendar more room when you need it.

### Events

- **Drag to create.** Drag across empty time to open a new event with that time range filled in.
- **Drag to move** an event to another day or time.
- **Drag to resize** an event from its top or bottom edge. Times snap to 15 minutes.
- **Edit in place.** Set the title, time range, color, location, and Space in a popover.

### Tasks

- **Task list** in the sidebar. Create, complete, and delete tasks there.
- **Optional due dates.** A task with a due date also shows on the calendar.

### Spaces

- **One Space per commitment.** Each Space holds the events and tasks of one class, project, or job.
- **Color-coded.** Each item takes its Space's color.
- **Hide a Space** to remove its items from the calendar for a while.
- **Space manager** in the sidebar creates, renames, recolors, and deletes Spaces.

### Account

- **Waitlist.** The landing page takes sign-ups before the app opens to the public.
- **Demo login.** One demo account opens the full app.
- **Private data.** Each account sees only its own events, tasks, and Spaces.

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Framework | [Next.js](https://nextjs.org/) App Router, React 19, React Compiler |
| Language | [TypeScript](https://www.typescriptlang.org/), strict mode |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [daisyUI](https://daisyui.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Dates | [date-fns](https://date-fns.org/) |
| Auth | [Supabase Auth](https://supabase.com/auth) through `@supabase/ssr` |
| Database | PostgreSQL on Supabase, [Drizzle ORM](https://orm.drizzle.team/), `postgres.js` |
| Runtime and package manager | [Bun](https://bun.sh/) |
| Tests | `bun:test` |

## Where the code lives

This map lists folders, not files. Open a folder to see what it holds.

| Path | What it holds |
| :--- | :--- |
| `src/app/` | Pages and layouts. `(marketing)/` holds the landing and login pages. `(app)/app/` holds the calendar. |
| `src/app/api/` | The API: `events`, `tasks`, `categories` (Spaces), `waitlist`, and `ping`. |
| `src/proxy.ts` | Sends signed-out visitors to `/login` and signed-in visitors to `/app`. |
| `src/components/` | React components. `Calendar.tsx` holds the calendar state. `TimeGrid.tsx` draws the Week and Day grids. |
| `src/hooks/` | Data hooks (`useCalendarEvents`, `useTasks`, `useCategories`) and the drag hooks (`useCreateDrag`, `useMoveDrag`, `useResizeDrag`). |
| `src/lib/` | Code that runs without React: Supabase clients, API helpers, request checks, and calendar math. |
| `src/db/` | The Drizzle client, the table schemas in `schema/`, and the seed scripts. |
| `drizzle/` | Generated SQL migrations. |

## Get started

You need [Bun](https://bun.sh/) and a [Supabase](https://supabase.com/) project.

1. Clone the repository and install the dependencies:

	```bash
	git clone https://github.com/edwrdrvera/Kalend.git
	cd Kalend
	bun install
	```

2. Copy the example environment file:

	```bash
	cp .env.example .env.local
	```

3. Fill in `.env.local`. `.env.example` says where to find each value.

	| Variable | Used by |
	| :--- | :--- |
	| `DATABASE_URL` | The app and Drizzle. Use the Supabase transaction pooler string, port 6543. |
	| `NEXT_PUBLIC_SUPABASE_URL` | Sign-in, in the browser and on the server. |
	| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sign-in, in the browser and on the server. |

4. Apply the database migrations:

	```bash
	bunx drizzle-kit migrate
	```

5. Start the development server:

	```bash
	bun run dev
	```

	Open [http://localhost:3000](http://localhost:3000). If you change a `NEXT_PUBLIC_*` variable, restart the server. Next.js copies those values into the browser code when the server starts.

To load demo data, run the checks, change the schema, or deploy, see [DEVELOPMENT.md](DEVELOPMENT.md).

## License

MIT.
