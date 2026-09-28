// PreToolUse hook for Bash. Commands that CLAUDE.md says need the user's OK
// (history rewrites, force-pushes, the paid fresh-session review) go to a
// permission prompt, so a session or subagent that never read the rule still
// can't run them silently.

const gates: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\bgit\s+push\b[^;&|]*(\s(-f|--force|--force-with-lease)\b|\s\+\S)/,
    reason: "Force-pushing needs the user's OK (CLAUDE.md).",
  },
  {
    pattern: /\bgit\s+(rebase|filter-branch|filter-repo)\b|\bgit\s+reset\b[^;&|]*--hard\b/,
    reason: "Rewriting history needs the user's OK (CLAUDE.md).",
  },
  {
    pattern: /\breview:pr\b|\bscripts\/review-pr\.ts\b/,
    reason: "The fresh-session review needs the user's OK before it runs (CLAUDE.md).",
  },
];

export function gateFor(command: string): string | null {
  return gates.find((gate) => gate.pattern.test(command))?.reason ?? null;
}

if (import.meta.main) {
  const input = JSON.parse(await Bun.stdin.text());
  const reason = gateFor(input.tool_input?.command ?? "");
  if (reason) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: reason,
        },
      }),
    );
  }
}
