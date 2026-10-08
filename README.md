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
| Auth | [Better Auth](https://www.better-auth.com/), with users and sessions in the app's database |
| Database | Self-hosted PostgreSQL 15+, [Drizzle ORM](https://orm.drizzle.team/), `postgres.js` |
| Runtime and package manager | [Bun](https://bun.sh/) |
| Tests | `bun:test` |

## Where the code lives

This map lists folders, not files. Open a folder to see what it holds.

| Path | What it holds |
| :--- | :--- |
| `src/app/` | Pages and layouts. `(marketing)/` holds the landing and login pages. `(app)/app/` holds the calendar. |
| `src/app/api/` | The API: `events`, `tasks`, `categories` (Spaces), `alerts`, `waitlist`, `ping`, and Better Auth's `auth` endpoints. |
| `src/proxy.ts` | Sends signed-out visitors to `/login` and signed-in visitors to `/app`. |
| `src/components/` | React components. `Calendar.tsx` holds the calendar state. `TimeGrid.tsx` draws the Week and Day grids. |
| `src/hooks/` | Data hooks (`useCalendarEvents`, `useTasks`, `useCategories`) and the drag hooks (`useCreateDrag`, `useMoveDrag`, `useResizeDrag`). |
| `src/lib/` | Code that runs without React: the Better Auth setup, API helpers, request checks, and calendar math. |
| `src/db/` | The Drizzle client, the table schemas in `schema/`, and the seed scripts. |
| `drizzle/` | Generated SQL migrations. |

## Get started

You need [Bun](https://bun.sh/) and a PostgreSQL 15 or later database. A local Docker container works:

```bash
docker run -d --name kalend-pg -p 5432:5432 -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=kalend postgres:17
```

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
	| `DATABASE_URL` | The app, Drizzle, and Better Auth. A plain Postgres connection string. |
	| `BETTER_AUTH_SECRET` | Signs session cookies. Generate one with `openssl rand -base64 32`. |
	| `BETTER_AUTH_URL` | The app's origin, `http://localhost:3000` in development. |
	| `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` | The demo login that the seed creates. |

4. Apply the database migrations. `--bun` makes drizzle-kit read `.env.local`:

	```bash
	bunx --bun drizzle-kit migrate
	```

5. Create the demo login and its sample data. See [DEVELOPMENT.md](DEVELOPMENT.md#load-the-demo-data).

6. Start the development server:

	```bash
	bun run dev
	```

	Open [http://localhost:3000](http://localhost:3000) and sign in with the demo login.

To load demo data, run the checks, change the schema, or deploy, see [DEVELOPMENT.md](DEVELOPMENT.md).

## License

MIT.
