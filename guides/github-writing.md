# Writing PRs and issues

A PR body or issue is a briefing. A reviewer who hasn't read the diff and doesn't know the codebase should understand it in under a minute.

## Keep it plain and high level

Leave out file, component, and function names, library internals, and implementation detail. Say what changed and why it matters, not how.

This overrides the `pstack:technical-writing` rule to write real symbol names. That rule still applies to code comments, docs in `guides/`, and commit messages.

## Write each sentence for a tired reader

These rules come from the `pstack:technical-writing` and `pstack:unslop` skills. Run `pstack:unslop` on every PR body and issue before you post it.

- Put one thought in each sentence. Split a sentence longer than about 25 words.
- Say who does what: "the calendar saves the event", not "the event is saved".
- Use the short, everyday word: "use", not "utilize" or "leverage". Cut every word that does no work.
- Be specific. "Deleting a task no longer clears the whole list" beats "fixed task deletion issues".
- Call each thing by one name everywhere in the text.
- Keep "only" and "not" next to the word they change. Make every "it" and "this" point at one obvious noun.
- Use periods and commas. Don't use em dashes, semicolons, or slashes.
- Write whole sentences with their articles and verbs. No arrows or symbol shorthand.
- Don't use hedging ("might potentially"), filler ("in order to", "it is important to note"), or AI vocabulary ("enhance", "robust", "seamless", "crucial").
- Don't use decorative emojis, title case headings, or a bold label on every bullet.

## Pull requests

- **Title.** Use conventional-commit format in imperative lowercase, the same casing as commit messages. For example: `feat(calendar): delete event flow`. Cut articles and filler words. If the issue or PR discussion already uses an abbreviation such as `RLS`, use it instead of spelling it out.
- **Body.** Write 2 to 4 bullets with no sub-bullets. Each bullet states one change and why it matters.
- **Test plan.** Add a test-plan line only when something needs manual verification. Keep it just as plain.
- Link logs and long output. Don't paste them into the body.

## Confidence report

After you open a PR, post a confidence report as the first PR comment. It keeps the body short, and a reviewer who only reads the body loses nothing. The report says what you proved and what you didn't. Use the same plain language as the body.

Use this template. Group the fields under three bold headings so the reader can jump to what they need:

```markdown
### Confidence report

**Proof**
- **Tests:** [Which checks you ran and whether they passed]
- **Runtime:** [What you did in the running app, as a user would]
- **Visual:** [What the user sees now and which screens you checked]

**Gaps**
- **Not verified:** [Everything you couldn't check, and why]

**Impact**
- **What changed:** [The behavior that is different now]
- **What must not change:** [The behavior that has to stay the same, and how you checked it]
- **How far failure can travel:** [Who or what breaks if this is wrong]
- **Rollback:** [How to undo it]
```

Layout rules:

- Fill in every field. A blank field means you didn't look.
- When a field lists more than one thing, make each thing its own sub-bullet under the field. Never join them into one run-on line.
- Keep each bullet to 1 or 2 short lines. Put the result first, then the detail.
- Screenshots stay in the session, so describe what they showed.
- Report what you ran, not what should work. "The task list loads after deleting a task" is a result. "Deleting should work now" is not.
- Leave out the Visual field only when nothing changes on screen, and say so.
- For a database change, Rollback names the reverse migration or the plan to fix forward. "Revert the PR" isn't enough once a migration has run.

Example of a field that lists several things:

```markdown
- **Not verified:**
  - Signed-in click-through, because the demo login wasn't available.
  - Mobile layout below 400px.
```

### Trivial tier

A trivial PR (under 40 changed lines, no high-tier file) posts no report comment. End the PR body with one line: `Verified: [what you ran or checked, and what you saw]`.

### Short form (low tier only)

A low-tier PR changes nothing risky, so the report is three lines:

```markdown
### Confidence report
- **What changed:** [The behavior that is different now]
- **How verified:** [Checks you ran, and what you saw in the browser if it's visible]
- **Not verified:** [Everything you couldn't check, and why]
```

Use sub-bullets when a field lists more than one thing.

## Issues

Every GitHub issue body follows this template:

**Issue #[Number]. [Title]**
* **Current state:** Currently, [what the system does now and why it is a problem].
* **Proposed fix:** [What is changing and the outcome you want]
* **Validation:** [How to check the fix works]

- Keep each point to 1 or 2 sentences.
- Cover the problem, the fix, and how to check it. Leave out blockquotes, chat-style filler, and step-by-step instructions.
- State each fact once. Don't add a trailing clause that repeats the consequence, such as "..., which means..." or "..., so that...". If the consequence needs saying, give it its own sentence within the limit.
