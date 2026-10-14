---
extends: feature, bug-fix, opening-a-pr
when: Any code change or bug fix in the Kalend repo, from building to an open PR into develop.
---

### Kalend

Kalend's rules come from the root `CLAUDE.md` and `guides/`. This playbook adapts pstack's steps to them and to a small token budget. Heavy review is for high-tier PRs only.

- **In** "`how` over the affected subsystem." Read the root `CLAUDE.md`, `guides/agent-rules.md`, and the `CLAUDE.md` of every directory you will touch. Run `how` only when the area is still unclear after that.
- **Replace** "`architect` for parallel design exploration." Run `architect` only when the change crosses a function boundary and the shape is not obvious. Otherwise write the data shape in the todo list and go on. Mark the step `skip: obvious shape`.
- **Replace** "Delegate code-writing to a subagent using your configured feature model" Write the code yourself, in your own worktree. You are already the delegate. Do not start another code-writing subagent and do not start `arena`. Keep the rest of the step: name the data shape first, keep comments clean, and commit as you go. Then, for the same step:
- **Replace** "Delegate implementation to a subagent using your configured bug-fix model" Write the fix yourself, in your own worktree. Do not start another code-writing subagent.
- **Replace** "If the design is contested, `interrogate` before shipping." Run `bun run review:tier`. Run `interrogate` only when it prints high and the design is contested. Otherwise mark the step `skip: tier`.
- **After** "Verify on the matching surface." Run `bunx tsc --noEmit` and `bun test`. If the change is visible in the app and the PR is not high tier, also run the project `verify` skill in the browser. On a high-tier PR, leave the browser check to the verifier and say so in the report.
- **After** "Verify on the same surface." Run `bunx tsc --noEmit` and `bun test`. Show the failing test or repro before the fix and the passing result after.
- **Replace** "Rebase into small, ordered commits." Commit in small steps as you go, per `guides/git-workflow.md`. Do not rebase. A rebase needs the owner's approval.
- **Replace** "Work from a git worktree off main." Work from a git worktree off `develop`.
- **Replace** "Rebase into small, ordered commits before opening PRs." Commit in small steps as you go. Do not rebase.
- **Replace** "A subagent that opens a PR runs `interrogate`, `/deslop`, and `/no-comments`, and posts the URL." A subagent that opens a PR runs `/deslop` and `/no-comments`, posts the URL, and returns. It runs `interrogate` only on a high-tier PR.
- **Replace** "Run **Opening a PR**." Follow "Opening a PR for Kalend" below.

## Opening a PR for Kalend

1. Run `git fetch origin develop`, then `bun run review:tier`. The PR goes into `develop` and closes its issue with `Closes #<issue>`.
2. Run `/deslop` and `/no-comments` over the diff. Type-check and test again after.
3. Write the title in conventional-commit form. Write the body per `guides/github-writing.md`. Plain words, no file or function names, no em dashes. That guide overrides pstack's description sections.
4. Open the PR ready, never draft.
5. Post the confidence report as the first comment, in the form the tier asks for in `CLAUDE.md`. A trivial PR needs only a `Verified:` line in the body.
6. For medium and high tiers, run `pstack:make-pr-easy-to-review`.
7. Babysit by tier. Trivial: no, CI must pass. Low: only if CI fails. Medium and high: yes.
8. For a high-tier PR, tell the owner the tier and what the PR touches, then ask whether to run `bun run review:pr`. Do not run it first. Trivial to medium PRs get no fresh review unless the owner asks, or an agent suggests one with its reason and the owner approves.
9. Stop at merge-ready. The owner merges.

## Standing orders

- This playbook's tier rules override poteto-mode's Non-negotiables triggers for `architect` and `interrogate`, and the bundled `opening-a-pr` steps.
- Never force-push, rewrite history, or merge without the owner's yes.
- Work in a worktree off `develop`, one writer per branch. Copy `.env.local` into a new worktree before any browser check.
- One builder at a time. Fan out with `swarm` or `arena` only on high-tier work.
- Never run a review in the session that wrote the code.
- Log each review finding with `bun run review:log add`.
- Stop and ask only for decisions the owner must make, or before anything destructive.
