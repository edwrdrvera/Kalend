# Development

These steps are for maintaining Kalend. To run the app locally, start with [the README](README.md#get-started).

## Load the demo data

You need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for step 1.

Three scripts build the demo account. Each one builds on the one before it, so run them in this order. All three are safe to run again.

1. Create the demo login, or reset its password.:

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
