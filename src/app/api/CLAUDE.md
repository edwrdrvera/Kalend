# src/app/api

Next.js Route Handlers: `src/app/api/<name>/route.ts` for collections, `<name>/[id]/route.ts` for single records. Export `GET`/`POST`/`PATCH`/`DELETE`, each built with `withUser(...)` and returning `ok(...)` or `fail(...)` from `@/lib/api/route-handler`.

Copy `events/route.ts` and `events/[id]/route.ts` when adding an endpoint. They are the canonical shape. (`api/ping` is a health check, not a template for production logic, and is excluded from the matcher in `src/proxy.ts`.)

`api/waitlist` is the one deliberately public, unauthenticated endpoint (the landing page's email capture, no user data behind it) — also excluded from the matcher in `src/proxy.ts`. It doesn't use `withUser`, so it keeps its own try/catch, but it still validates the body and returns the same response envelope.

## Required shape of every user-facing handler

1. Wrap the handler in `withUser(async (request, context, user) => ...)`. It resolves the caller and returns 401 when there is none, so the handler body starts with a verified `user`. Don't call `getAuthenticatedUser()` yourself.
2. Scope every query to the caller: `eq(table.user_id, user.id)`, combined with `and(...)` alongside the id filter on `[id]` routes. This filter **is** the access control. RLS does not cover this client (see `src/db/CLAUDE.md`). A lint rule (`access-control/scoped-query`, in `eslint-rules/`) fails the build when a select, update or delete over `events`/`tasks`/`categories` here, in `src/lib/api`, or in `src/db` (seeds excepted) does not reach a `.where(...)` holding that filter at the top level or inside `and(...)`. `db.query.<table>` and `db.execute` are reported outright. An insert into those tables sets `user_id: user.id` inline in `.values({...})`, never a value from the request body; the same lint rule fails an insert without it, with a spread or computed key after it, or with an `onConflictDoUpdate` whose `set` changes it. Write the filter inline in the `.where(...)`; a filter hoisted into a variable is invisible to the rule and will report. The rule cannot be disabled inline (a lint rule and a test both block it), so a genuine exception means changing the rule itself.
3. Validate the body before touching the DB with the resource's pure parser in `src/lib/api/` (`parseEventCreate`/`parseEventPatch`, `parseTaskCreate`/`parseTaskPatch`; field rules in `parse-fields.ts`, shared by both modes so create and update can't drift). On `!parsed.ok` return `fail(parsed.error, 400)`. A body key with no parser rule is rejected (`Unknown field: <key>`), so a misspelled field fails loudly instead of being dropped. Checks that need the DB (Space ownership, PATCH `start_at < end_at` against the stored row) stay in the handler. Categories still validate inline (two fields).
4. Don't add a try/catch. `withUser` turns invalid JSON into a 400 and any other thrown error into a logged 500. Return `ok(data)` (pass `{ status: 201 }` on create) or `fail(message, status)`.

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

`<route>/__tests__/<name>-api.test.ts` per endpoint group (e.g. `events/__tests__/events-api.test.ts`), `bun:test` with `setupMockDb` from `src/test-utils/mock-db.ts`. It mocks both the database and the signed-in user, and fails the test when a query skips the `user_id` filter. Don't mock the auth helper separately. Run with `bun test`.
