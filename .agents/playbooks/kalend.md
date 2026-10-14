---
extends: feature, bug-fix, opening-a-pr
when: Any code change or bug fix in the Kalend repo, from building to an open PR into develop.
---

### Kalend

Kalend's rules come from the root `CLAUDE.md` and `guides/`. This playbook adapts pstack's steps to them and to a small token budget. Heavy review is for high-tier PRs only.

- **In** "`how` over the affected subsystem." Read the root `CLAUDE.md`, `guides/agent-rules.md`, and the `CLAUDE.md` of every directory you will touch. Run `how` only when the area is still unclear after that.
- **Replace** "`architect` for parallel design exploration." Run `architect` only when the change crosses a function boundary and the shape is not obvious. Otherwise write the data shape in the todo list and go on. Mark the step `skip: obvious shape`.
- **Replace** "If the design is contested, `interrogate` before shipping." Run `bun run review:tier`. Run `interrogate` only when it prints high and the design is contested. Otherwise mark the step `skip: tier`.
- **After** "Verify on the matching surface." Run `bunx tsc --noEmit` and `bun test`. If the change is visible in the app, also run the project `verify` skill in the browser. Skip the browser when nothing visible changed, and say so.
- **Replace** "Run **Opening a PR**." Follow "Opening a PR for Kalend" below.

## Opening a PR for Kalend

1. Run `git fetch origin develop`, then `bun run review:tier`. The PR goes into `develop` and closes its issue with `Closes #<issue>`.
2. Run `/deslop` and `/no-comments` over the diff. Type-check and test again after.
3. Write the title in conventional-commit form. Write the body per `guides/github-writing.md`. Plain words, no file or function names, no em dashes. That guide overrides pstack's description sections.
4. Open the PR ready, never draft. Add no attribution lines to commits or the body.
5. Post the confidence report as the first comment, in the form the tier asks for in `CLAUDE.md`. A trivial PR needs only a `Verified:` line in the body.
6. Babysit by tier. Trivial: no, CI must pass. Low: only if CI fails. Medium and high: yes.
7. For a high-tier PR, tell the owner the tier and what the PR touches, then ask whether to run `bun run review:pr`. Do not run it first. Trivial to medium PRs get no fresh review unless the owner asks, or an agent suggests one with its reason and the owner approves.
8. Stop at merge-ready. The owner merges.

## Standing orders

- Never force-push, rewrite history, or merge without the owner's yes.
- Work in a worktree off `develop`, one writer per branch.
- One builder at a time. Fan out with `swarm` or `arena` only on high-tier work.
- Never run a review in the session that wrote the code.
- Log each review finding with `bun run review:log add`.
- Stop and ask only for decisions the owner must make, or before anything destructive.
