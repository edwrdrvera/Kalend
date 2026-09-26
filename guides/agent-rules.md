# Agent rules for a healthy codebase

These rules are Lauren Tan's (poteto) lessons on working with agents, taken from her talk, her post, and her feature-blueprint slide, and applied to Kalend.

Each rule gives the lesson, what it means in Kalend, and what enforces it. **Enforced** means it fails lint, the type check, or `bun test` in CI when broken. **Convention** means it relies on you.

## The idea behind all of them

You can only hand agents more work once you trust their output. You build that trust the way a manager builds it with a new hire: give them a way to check their own work, and shape the environment so the easy way is the right way. Your job shifts from writing every line to designing the environment the agents work in.

The codebase is the strongest lever, because agents copy existing patterns. Every rule you move out of a doc or a review comment and into the code is a rule an agent can't forget.

## Part 1. Verify your own work

### 1. Run the real thing before you call it done

- **Lesson:** Verification is the most important skill an agent can have. The agent runs the code the way a user reaches it (a browser, a simulator, a performance trace) and checks the result. That doesn't guarantee good code, but it gets you correct code. Without it, the human is the verifier and the bottleneck, and no work can run in parallel.
- **Here:** A change a user can see is not done until you've driven it in the browser. Use the `verify` skill in `.claude/skills/verify/`. Passing unit tests is not the same as the feature working.
- **Enforced by:** Convention. `CLAUDE.md`'s definition of done requires the browser check.

### 2. Keep a feature map

- **Lesson:** A verification skill is useless if the agent can't find the feature. Pair it with a feature map: each feature, its sub-features, how a user reaches it, its keyboard shortcuts, and the selectors to click. With a map, even a vague report ("the sidebar is slow", a screenshot and "???") becomes something the agent can navigate to. Keep the map current as features change.
- **Here:** `.claude/skills/verify/features/` is Kalend's feature map (`tasks.md`, `events.md`, `spaces.md`, `waitlist.md`, `auth.md`). When you add or change a feature, update its entry in the same PR. Run `/maintain-verification-skill` when the map drifts.
- **Enforced by:** Convention.

### 3. Don't guess. Read the code

- **Lesson:** A common failure is an agent confidently naming the cause of a bug without ever reading the code involved. Look up the code, use subagents to search, and stop guessing.
- **Here:** Before you state a cause, read the code path you're blaming and reproduce the problem. Say what you checked. A confident claim you didn't check is worse than "I don't know yet".
- **Enforced by:** Convention. `pstack:how` and `pstack:why` exist for this.

## Part 2. Improve how agents work here

### 4. Turn each observed failure into a skill

- **Lesson:** Watch agents closely at first. Read their tool calls and their reasoning, act like a backseat driver, and ask why they did it that way. Each repeated failure becomes a skill. A skill is just instructions, but good instructions pull much better work out of a model.
- **Here:** When an agent in this repo fails the same way twice, write it down as a skill in `.claude/skills/` or a rule in this file. If code can catch the failure, add a check instead (rule 7).
- **Enforced by:** Convention.

### 5. Test skills like code

- **Lesson:** An eval is a unit test for an agent. Write a rubric, run the skill in several subagents whose working directories don't reveal it's a test (agents behave differently when they know), and have a judge on a different model score the runs so one model's bias doesn't decide. Re-run the eval every time the skill changes. You can loop on an eval until it scores well.
- **Here:** When you change a skill in `.claude/skills/`, run the pstack eval playbook on it before relying on the change.
- **Enforced by:** Convention.

### 6. Build trust in steps

- **Lesson:** Start locally, where you can watch the agent work. Move to parallel and background agents only after the local results earn trust. Jumping straight to many agents wastes tokens.
- **Here:** A new kind of task runs in the foreground first. Once it has produced trustworthy results, it can run in the background or in parallel.
- **Enforced by:** Convention.

## Part 3. Make the right way the easy way

### 7. Turn every repeated mistake, and every review comment, into a check

- **Lesson:** Enforcing a codebase's rules by having a human read each diff and say "don't do this" is the worst place to be. Treat every such review comment as a code smell. Ask how to turn it into a lint rule, a CI failure, or a change that removes the problem entirely.
- **Here:** When you fix the same kind of mistake twice, or a review asks for the same thing twice, add a type, lint rule, or test that fails on it. Prefer a type that can't represent the mistake, then a lint rule, then a test. Delete the doc line the check replaces. Every new lint rule gets a planted case in `eslint-rules/__tests__/` that fails against the old config.
- **Enforced by:** This rule produces the others. The templates to copy are `eslint-rules/scoped-query.mjs` and `eslint.config.mjs`.

### 8. The shortest path is the best path

- **Lesson:** Agents take the quickest way to solve a problem, so make the quickest way the correct one. Design for the least capable agent. A codebase with no guardrails spirals out of control, because every agent takes a different shortcut. Put strong constraints on new code from the start.
- **Here:** The easiest way to get data onto a screen is the correct one: a hook calls an `/api` route through `mutateResource`. The easy wrong paths fail lint: importing the database, calling `fetch` in a component, or querying a table through the browser Supabase client.
- **Enforced by:** `eslint.config.mjs`. `eslint-rules/__tests__/boundaries.test.ts` plants each shortcut and expects it reported.

### 9. Enforcement comes in hard and soft layers

- **Lesson:** The strongest layer is the codebase itself: a strict architecture with one conventional way to build things. Next is static analysis, meaning CI checks, lint rules for bad patterns you've seen, and compiler errors. These are hard, because they turn CI red. Rules files, review bots, skills, and style guides are soft, because agents can forget them. Use every layer, but never rely on the soft ones alone, or the codebase degrades. A stricter compiler buys more trust, because code that compiles is more likely to be correct.
- **Here:**

  | Layer | Kalend | Hard or soft |
  | --- | --- | --- |
  | Codebase conventions | One path per job (rule 12), per-directory `CLAUDE.md` files | Hard where lint backs it |
  | Static analysis | ESLint, `tsc`, `bun test` in `.github/workflows/ci.yml` | Hard |
  | Review bots | `/code-review` and `/security-review` (project skills in `.claude/skills/`), with depth set by `bun run review:tier` | Soft |
  | Skills | `.claude/skills/` | Soft |
  | Style guide | `guides/code-style.md`, this file | Soft |

  Push rules up this table. TypeScript strict mode is Kalend's compiler layer, so don't weaken it with `any`, casts, or `@ts-ignore`.
- **Enforced by:** CI for the hard rows.

### 10. Ban the footguns you keep seeing

- **Lesson:** Make CI check for every pattern agents get wrong. Her example is banning React's `useEffect`, a common source of bugs, and letting CI fail on it.
- **Here:** Kalend already bans direct database access and `fetch` outside hooks. `useEffect` is not banned, because the data hooks use it for loading. A candidate rule is banning it in `src/components/` so effects live only in hooks. Eleven components use it today (September 2026), so the ban would mean moving those effects into hooks first.
- **Enforced by:** The existing bans in `eslint.config.mjs`. The `useEffect` ban is a proposal.

### 11. No comments that carry history or excuses

- **Lesson:** She bans code comments in CI. Nearly all agent-written comments describe some past event that has nothing to do with the code. Agents also turn one-off review feedback into a comment that reads like a permanent rule ("the reviewer said never do this").
- **Here:** Never write a comment that records history, quotes a reviewer, explains a workaround, or excuses a problem ("TODO", "hack", "can't because", "per review"). Git history and the PR hold that. A comment that states a rule becomes a check under rule 7.
- **Open question:** `guides/code-style.md` still allows short comments that explain a non-obvious *why*. Her lesson is a full ban. The user hasn't decided whether to adopt it. Until then, follow `guides/code-style.md` for why-comments and ban everything above.
- **Enforced by:** Convention. `pstack:no-comments` audits a diff.

## Part 4. Structure

### 12. One paved path, and gardeners to keep it

- **Lesson:** Every team needs gardeners. Delete technical debt. Keep one conventional way to do each thing, with enough CI and lint guidance that agents don't have to guess. When you see a bad pattern, write a lint rule so it can't spread. Keep the codebase in a state you'd be happy for an agent to copy.
- **Here:**
  - Data goes through hooks. Writes go through `mutateResource`. Validation goes through the `src/lib/api/` parsers. Routes are wrapped in `withUser` and return `ok`/`fail`.
  - A second way to do something already done is debt. Migrate the old callers and delete the old way in the same change.
  - Before you commit, ask whether you'd be happy for the next agent to copy this code.
- **Enforced by:** Partly lint, partly the review steps in `CLAUDE.md`.

### 13. Named building blocks, one place each

- **Lesson:** Organize the app around a small set of named building blocks, each with one place in the tree, one job, and one conventional way to create it. Keep all of a feature's code in one folder, so an agent can do most of its work there without searching. Her blocks are a feature (one folder of product UI), a client (state behind hooks and commands), an entrypoint (a view a user can open), and a host (durable behavior behind a typed contract).
- **Here:**

  | Building block | Kalend | Place |
  | --- | --- | --- |
  | Feature | Product UI | `src/components/` today. Per-feature folders are deferred until a lint rule depends on them. |
  | Client | Data state plus commands | `src/hooks/` (`useTasks` returns data plus `createTask`, `toggleComplete`, `deleteTask`) |
  | Entrypoint | A page a user opens | `src/app/(app)/`, `src/app/(marketing)/` |
  | Host | Durable behavior behind a contract | `src/app/api/` routes plus `src/lib/api/` parsers |

- **Enforced by:** The import boundaries in rule 14. Folder placement is otherwise a convention.

### 14. A folder says where code runs and what it may import

- **Lesson:** A folder tells an agent where code runs and which imports are legal. Separate code by where it runs, and have CI check the import graph, so code meant for one side can't leak into the other.
- **Here:** Kalend's split is server and browser. The server-only files are listed in `serverFiles` in `eslint.config.mjs`: `src/app/api`, `src/lib/api`, the server Supabase files, `src/db`, and `src/proxy.ts`. Every other file under `src/` may end up in the browser. Browser files can't import server-only files, including by relative path, `import()`, or `require`. Server files can't import React, components, or hooks. App code can't import `src/test-utils`.
- **Enforced by:** `eslint.config.mjs`. A new folder is browser-side automatically, so it's covered without editing the config.

### 15. Shared types sit between the two sides

- **Lesson:** A shared layer holds the types both sides use, including typed arguments and failures. Each side imports only the layers it's allowed to.
- **Here:** `src/lib/calendar-types.ts` holds the wire types: response shapes, plus request bodies such as `TaskCreateRequest` and `TaskPatchRequest`. The server parser's rules must match the request type's keys (`satisfies` in `src/lib/api/task-body.ts`), so a field added on one side only fails the type check.
- **Enforced by:** `tsc`. The API also rejects any request field it doesn't know (`src/lib/api/parse-fields.ts`), so a mismatch that skips the type check still fails at runtime.

### 16. A feature is a vertical slice with named owners

- **Lesson:** Split a feature into UI, client, shared edge, and host, and give each part one owner. The UI stays thin and reads hooks. The client owns the local copy of the data. The host owns durable behavior. A component never handles transport, retries, or startup.
- **Here:** Component, then hook, then shared types, then API route. A component renders and calls hook commands. It never calls the network, retries, reconciles optimistic updates, or reads the database. The hook owns local state and optimistic updates. The route owns validation, the user filter, and writes.
- **Enforced by:** The network and import rules in `eslint.config.mjs`.

### 17. A correct edit in one file keeps the whole app safe

- **Lesson:** Agent-friendly means that a correct edit to the file you have open preserves the invariants of the whole app.
- **Here:** An agent editing one route shouldn't need to remember a rule stated somewhere else. The most important invariant is that every query over events, tasks, or categories is limited to the signed-in user.
- **Enforced by:** `access-control/scoped-query`. Every select, update, or delete on those tables must reach a `.where` with `eq(<table>.user_id, user.id)` at the top level or inside `and(...)`. Every insert into them must set `user_id: user.id` inline in `.values({...})`. It resolves renamed tables, rejects a user id taken from the request, and reports `db.query.<table>`, `.execute`, and any query whose table it can't identify. No comment can disable it.

## Part 5. Delivery

### 18. Small, atomic PRs

- **Lesson:** Split work into several PRs, each describing one small piece. Git history is useful context for agents and people, and a small PR makes a bug easy to find and revert. There's no hard size cap. The point is one concern per PR.
- **Here:** One concern per PR and one logical step per commit (`guides/git-workflow.md`). A PR that mixes a refactor with a behavior change gets split.
- **Enforced by:** Convention.

### 19. Spend tokens up front on constraints

- **Lesson:** Refactoring a codebase into a strict shape costs a lot up front. It pays back, because then even small models write good code, and people who aren't engineers can contribute safely. Weigh that cost against the ongoing cost of reviewing everything by hand.
- **Here:** When a guardrail would take real work but blocks a whole class of mistakes, it's worth doing. Prefer it over adding another soft rule.
- **Enforced by:** Judgment.

## Inline disables

The boundary rules and `access-control/scoped-query` can't be switched off with a comment. The eslint-comments plugin blocks it, and a test scans `src/` for the one form lint can't see. If correct code trips a rule, rewrite the code to fit, or change the rule itself in a reviewed PR.
