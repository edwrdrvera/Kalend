# src/app/api

Next.js Route Handlers: `src/app/api/<name>/route.ts` for collections, `<name>/[id]/route.ts` for single records. Export `GET`/`POST`/`PATCH`/`DELETE` and return `NextResponse.json(...)`.

Copy `events/route.ts` and `events/[id]/route.ts` when adding an endpoint. They are the canonical shape. (`api/ping` is a health check, not a template for production logic, and is excluded from the middleware matcher.)

`api/waitlist` is the one deliberately public, unauthenticated endpoint (the landing page's email capture, no user data behind it) — also excluded from the middleware matcher. Skip the auth-check step below for it, but everything else (validate the body, try/catch, response envelope) still applies.

## Required shape of every user-facing handler

1. `const user = await getAuthenticatedUser()` from `@/lib/supabase/auth-user`; return 401 `{ success: false, error: "Unauthorized" }` when it's null.
2. Scope every query to the caller: `eq(table.user_id, user.id)`, combined with `and(...)` alongside the id filter on `[id]` routes. This filter **is** the access control. RLS does not cover this client (see `src/db/CLAUDE.md`). A lint rule (`access-control/scoped-query`, in `eslint-rules/`) fails the build when a select, update or delete over `events`/`tasks`/`categories` here, in `src/lib/api`, or in `src/db` (seeds excepted) does not reach a `.where(...)` holding that filter at the top level or inside `and(...)`. `db.query.<table>` and `db.execute` are reported outright. Write the filter inline in the `.where(...)`; a filter hoisted into a variable is invisible to the rule and will report. The rule cannot be disabled inline (a lint rule and a test both block it), so a genuine exception means changing the rule itself.
3. Validate the body before touching the DB with the resource's pure parser in `src/lib/api/` (`parseEventCreate`/`parseEventPatch`, `parseTaskCreate`/`parseTaskPatch`; field rules in `parse-fields.ts`, shared by both modes so create and update can't drift). On `!parsed.ok` return `fail(parsed.error, 400)`. A body key with no parser rule is rejected (`Unknown field: <key>`), so a misspelled field fails loudly instead of being dropped. Checks that need the DB (Space ownership, PATCH `start_at < end_at` against the stored row) stay in the handler. Categories still validate inline (two fields).
4. Wrap the handler in try/catch, `console.error("Database Error:", error)`, return 500 `{ success: false, error: "Internal Server Error" }`.

## Response envelope

Always `{ success: true, data }` or `{ success: false, error }`. Status codes: 201 on create, 200 otherwise, 400 validation, 401 unauthenticated, 404 not found, 500 server error.

## PATCH semantics

The patch parser returns only the fields that were sent (absent key = untouched), keyed by column name, so it can feed `.set(...)` directly or be adjusted first. For nullable links (`category_id`, `due_at`) the convention is: a value sets it, `null` clears it, omitted leaves it untouched.

## Route context

Params are async in this Next version:

```ts
interface RouteContext { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
```

## Tests

`__tests__/<name>-api.test.ts` per endpoint group, `bun:test` with `mock()` over the db module and the auth helper. Run with `bun test`.
