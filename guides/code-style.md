# Code Style

- Write clean, efficient code: prefer the simplest solution that actually solves the problem, and reuse existing helpers/components/schemas instead of duplicating logic that already exists elsewhere in the codebase.
- Don't do in a loop or with extra round trips what can be done in one pass or one query, and don't add abstractions, options, or generality a feature doesn't need yet.
- Match the surrounding code's style, naming, and comment density instead of introducing a new pattern for something the codebase already has a convention for.

## TypeScript

- Verify changes with `bunx tsc --noEmit` before committing. Reserve `bun run build` for the final check before merging a PR.
- No `any`. If a value's shape is genuinely unknown (parsed JSON, test mocks), use `unknown` and narrow it.
- Types that describe an API response as it arrives over the wire live in `src/lib/calendar-types.ts`, not in the Drizzle schema. Dates arrive as ISO strings over JSON, so a wire type is not the same as the `$inferSelect` type.

## Comments

The codebase comments the *why*, not the *what*: a comment explains a constraint that isn't visible in the code (a library quirk, a rendering trade-off, a rule the DB also enforces). Don't narrate what the next line plainly does.
