# Using pstack in Kalend

pstack is a set of skills and playbooks that steer agents toward verified, simple code. Kalend adapts it in `.agents/playbooks/kalend.md` and two agents in `.claude/agents/`. This guide says which to reach for, and what to skip to save tokens.

## Pick the tool for the job

| You want to | Use |
| --- | --- |
| Have Claude build an issue that needs your machine (migration, auth, browser check) | Label the issue `needs-claude`, then dispatch `kalend-builder` with the issue number |
| Have the cloud Builder bot build an issue | Leave the label off. Advisor and Builder handle it |
| Check a high-tier PR independently | Dispatch `kalend-verifier` on a different model than the builder |
| Chase a bug with an unknown cause | `/poteto-mode`, which picks the Bug fix playbook |
| Understand code before changing it | `/pstack:how` on the subsystem |
| Pick up unfinished work | `/poteto-mode` with the branch or PR, which picks Session pickup |
| Clean a diff before committing | `/deslop`, then `/no-comments` |
| Tidy PR text | `/unslop` |
| Decide which skill fits | `/poteto-help` with your question |

## What to skip below high tier

These fan out into extra agents, and each one reloads context.

- `swarm`, `arena`, and `interrogate`. Use them on high-tier work only.
- `architect`. Use it only when a change crosses a function boundary and the shape is unclear.
- More than one builder at a time.

Trivial to medium PRs get no fresh review unless you ask, or an agent suggests one and you approve. `CLAUDE.md` has the full tier table.

## Cost levers

- Set roles in `~/.claude/pstack-models.md`. A value like `sonnet @medium` runs that role on Sonnet at medium effort. Today the feature and bug-fix roles inherit the session model.
- Each subagent reads the 26 KB `poteto-mode` skill first. Start a subagent only when the work is worth that.
- The SessionStart hook is small. Turn it off with `session hook: off` in the same file if you want to invoke `/poteto-mode` yourself.

## Keeping the playbook honest

A pstack upgrade can rewrite a step that the Kalend playbook quotes. After upgrading, run the checker from the repo root. Use the newest version folder under `~/.claude/plugins/cache/pstack-claude/pstack/`:

```bash
node ~/.claude/plugins/cache/pstack-claude/pstack/<version>/skills/poteto-mode/scripts/check-playbooks.mjs .
```

It prints each quoted step that no longer matches. Fix those lines in `.agents/playbooks/kalend.md` before the next run.

## Where things live

- `.agents/playbooks/kalend.md`: the Kalend changes to pstack's steps, and the standing orders.
- `.claude/agents/kalend-builder.md` and `kalend-verifier.md`: the two agents.
- `guides/agents/triage-labels.md`: the `needs-claude` label.
- `guides/agent-rules.md`: the repo rules every agent reads first.
