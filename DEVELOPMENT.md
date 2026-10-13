# Development

These steps are for maintaining Kalend. To run the app locally, start with [the README](README.md#get-started).

## Load the demo data

Apply the migrations first (`bunx --bun drizzle-kit migrate`). Three scripts then build the demo account. Each one builds on the one before it, so run them in this order. All three are safe to run again.

1. Create the demo login from `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `.env.local`, or reset its password:

	```bash
	bun run db:seed:demo
	```

2. Load the sample events from `src/db/data/data.csv`:

	```bash
	bun run db:seed
	```

	If the database has one user, the script picks that user. Otherwise, set `SEED_USER_ID`. The script skips an event whose title and start time already exist.

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

3. Apply the migration. `--bun` makes drizzle-kit read `.env.local`:

	```bash
	bunx --bun drizzle-kit migrate
	```

4. Commit the schema change and the new files in `drizzle/` together.

To browse the database in a local UI, run `bunx drizzle-kit studio`.

## Deploy

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` (the public origin) on the server, apply the migrations, then run `bun run db:seed:demo`. Leave `KALEND_DEV_SIGN_IN` unset.

Sign-in rate limiting counts attempts per client IP, read from `x-forwarded-for`. Better Auth accepts that header only when it holds exactly one address, so run the app behind a reverse proxy that replaces the header with the real client address instead of appending to it. Without a usable address, every visitor shares one counter. The counts live in the app's memory, so they reset on restart and are not shared between processes.

## Vercel waitlist rate limit

Before you open the public waitlist, create and publish this Vercel Firewall rate-limit rule. The waitlist form's honeypot stops simple bots but does not limit request rate.

| Setting | Value |
| --- | --- |
| Environments | Production and Preview |
| Request method | `POST` |
| Request path | Equals `/api/waitlist` |
| Counting key | IP address |
| Algorithm | Fixed window |
| Window | 10 minutes |
| Request limit | 10 |
| Exceeded action | Rate limit with HTTP `429` |

Verify the rule against one Production URL and one Preview URL. The 11th request from one IP inside a window should get a `429`, and the form keeps the entered email and asks the visitor to wait. Local development does not emulate the Vercel Firewall.
