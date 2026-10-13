# AGENTS.md

This repo's agent instructions live in `CLAUDE.md` files. Read the root `CLAUDE.md` first and follow it as if it were this file.

A directory with its own `CLAUDE.md` adds rules for that area. The root file's "Directory context" section lists them. Read the one for a directory before you change code there.

Longer guides sit in `guides/`. Project skills sit in `.claude/skills/`. The root `CLAUDE.md` says when to read each one.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
