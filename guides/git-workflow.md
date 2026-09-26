# Git & Workflow Strategy

- **Base Branch:** `develop` (all feature work targets or branches off `develop`).
- **Feature Branches:** Create off `develop` using `feature/<feature-name>`.
- **Primary Branch:** Do not commit directly to `main`.
- **PR Required:** Every feature branch must be opened as a PR into `develop` (via `gh pr create`) once its work is done. Do not merge locally with `git merge`.
- **Releases to `main`:** `main` is updated via occasional batch release PRs (`develop` → `main`), not per task, e.g. after a `TASKS.md` phase wraps up, or whenever a release is explicitly requested. GitHub only allows one open PR per head→base pair, so a `develop`→`main` PR per task isn't viable anyway: each one would just contain everything the last one did, plus more, forcing them to be merged in strict sequence with no real review value over merging directly.
- **No `TASKS.md` references in GitHub-facing text:** never mention `TASKS.md` or its task numbers (e.g. "task 19") in issue titles/bodies, PR titles/bodies, or commit messages. It's a local, gitignored planning doc, meaningless to anyone reading the repo on GitHub.

## Commit Rules

- **Incremental Commits Required:** Break all task implementations down into small, atomic commits instead of bundling an entire feature branch into one commit.
- **Commit After Logical Steps:** Make a commit immediately after each distinct sub-task (e.g., state hooks, UI components, API routes, type fixes).
- **Conventional Commits:** Format commit messages as `<type>(<scope>): <summary>` in imperative lowercase, where `<scope>` is the area touched (e.g. `calendar`, `types`, `db`) and `<summary>` describes the change plainly enough that someone unfamiliar with the code understands what happened without opening the diff. Common `<type>` values:
  - `feat` — new user-facing behavior (e.g. `feat(calendar): add event fetching state`)
  - `fix` — bug fix, including type errors (e.g. `fix(types): resolve event id type mismatch`)
  - `refactor` — restructure code with no behavior change (e.g. `refactor(calendar): extract day-cell rendering into helper`)
  - `chore` — maintenance with no source behavior change: deps, config, schema tweaks (e.g. `chore(db): update schema`)
  - `docs` — documentation only (e.g. `docs(readme): document env var setup`)
  - `style` — formatting/whitespace, no logic change (e.g. `style(calendar): fix indentation`)
  - `test` — adding or updating tests

### Example Micro-Commit Workflow

When implementing a feature branch like `feature/render-events-on-grid`:

1. Add event fetch hooks and state management to `src/components/Calendar.tsx`
   → Commit: `feat(calendar): add event fetching state`
2. Update calendar day cells to render event titles with dynamic color coding
   → Commit: `feat(calendar): render color-coded events in day cells`
3. Verify type safety with `bunx tsc --noEmit` and resolve issues
   → Commit: `fix(types): resolve type safety errors`

## Resume Logging

When completing a major feature or branch, append a brief entry to `RESUME_NOTES.md` (local-only and gitignored; skip this step if the file isn't in your checkout) summarizing:

1. Technical implementation details
2. Architectural or state-management challenges overcome
