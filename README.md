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
| `docs/adr/` | Architecture decision records. |

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
	| `SUPABASE_SERVICE_ROLE_KEY` | `bun run db:seed:demo` only. Never expose it to the browser. |

4. Apply the database migrations:

	```bash
	bunx drizzle-kit migrate
	```

5. Start the development server:

	```bash
	bun run dev
	```

	Open [http://localhost:3000](http://localhost:3000). If you change a `NEXT_PUBLIC_*` variable, restart the server. Next.js copies those values into the browser code when the server starts.

## Load the demo data

Three scripts build the demo account. Each one builds on the one before it, so run them in this order. All three are safe to run again.

1. Create the demo login, or reset its password. The email defaults to `demo@kalend.app`. Set `DEMO_USER_EMAIL` to use another one.

	```bash
	DEMO_USER_PASSWORD=<password> bun run db:seed:demo
	```

2. Load the sample events from `src/db/data/data.csv`. Use the demo user's id from **Authentication > Users** in the Supabase dashboard:

	```bash
	SEED_USER_ID=<demo-user-uuid> bun run db:seed
	```

	The script skips an event whose title and start time already exist.

3. Create the Spaces and link the demo user's events and tasks to them:

	```bash
	bun run db:seed:spaces
	```

	If the database has one user, the script picks that user. Otherwise, set `SEED_USER_ID`.

## Check your changes

| Check | Command |
| :--- | :--- |
| Type-check | `bunx tsc --noEmit` |
| Unit tests | `bun test` |
| Lint | `bunx eslint .` |
| Production build | `bun run build` |

CI runs the type-check and the lint on every pull request. The lint includes a project rule that fails when an API query skips its `user_id` filter.

## Change the database schema

1. Edit the table files in `src/db/schema/`.
2. Generate the SQL migration:

	```bash
	bunx drizzle-kit generate
	```

3. Apply the migration:

	```bash
	bunx drizzle-kit migrate
	```

4. Commit the schema change and the new files in `drizzle/` together.

To browse the database in a local UI, run `bunx drizzle-kit studio`.

## Deploy to Vercel

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **Production** and **Preview** environments, then redeploy. A build that already exists keeps the old values.

Before you open the public waitlist, add its Vercel Firewall rule. See [the Vercel deployment guide](docs/vercel-deployment.md).

## License

MIT.
