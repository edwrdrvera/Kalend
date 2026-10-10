// PreToolUse hook for Bash. Commands that CLAUDE.md says need the user's OK
// (history rewrites, force-pushes, the paid fresh-session review) go to a
// permission prompt, so a session or subagent that never read the rule still
// can't run them silently.

const FORCE_PUSH = "Force-pushing needs the user's OK (CLAUDE.md).";
const REWRITE = "Rewriting history needs the user's OK (CLAUDE.md).";
const REVIEW = "The fresh-session review needs the user's OK before it runs (CLAUDE.md).";

type GitCall = { subcommand: string; args: string[] };

const shortCluster = (arg: string, letters: string) =>
  /^-[a-zA-Z]+$/.test(arg) && [...letters].some((letter) => arg.includes(letter));

const gitGates = new Map<string, (args: string[]) => string | null>(Object.entries({
  push: (args) => {
    for (const arg of args) {
      if (/^--force(-with-lease|-if-includes)?(=|$)/.test(arg) || shortCluster(arg, "f") || arg.startsWith("+")) {
        return FORCE_PUSH;
      }
    }
    return null;
  },
  commit: (args) => (args.includes("--amend") ? REWRITE : null),
  branch: (args) => (args.some((arg) => arg === "--force" || shortCluster(arg, "fM")) ? REWRITE : null),
  checkout: (args) => (args.includes("-B") ? REWRITE : null),
  switch: (args) => (args.some((arg) => arg === "-C" || arg === "--force-create") ? REWRITE : null),
  reset: (args) => (args.some((arg) => arg === "--hard" || arg === "--keep") ? REWRITE : null),
  "update-ref": () => REWRITE,
  rebase: () => REWRITE,
  "filter-branch": () => REWRITE,
  "filter-repo": () => REWRITE,
}));

const GLOBAL_OPTIONS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env"]);

function parseGitCall(segment: string): GitCall | null {
  const tokens = segment.split(/\s+/).map((token) => token.replace(/^[("'`$]+|[)"'`]+$/g, ""));
  let i = tokens.findIndex((token) => token === "git" || token.endsWith("/git"));
  if (i === -1) return null;
  for (i++; i < tokens.length && tokens[i].startsWith("-"); i++) {
    if (GLOBAL_OPTIONS_WITH_VALUE.has(tokens[i])) i++;
  }
  if (i >= tokens.length) return null;
  return { subcommand: tokens[i], args: tokens.slice(i + 1) };
}

export function gateFor(command: string): string | null {
  if (/\breview:pr\b|(^|[\s/])review-pr(\.ts)?($|[\s;&|)])/.test(command)) return REVIEW;
  for (const segment of command.split(/&&?|\|\|?|;|\n/)) {
    const call = parseGitCall(segment);
    const reason = call && gitGates.get(call.subcommand)?.(call.args);
    if (reason) return reason;
  }
  return null;
}

function commandFrom(stdin: string): string {
  try {
    return JSON.parse(stdin)?.tool_input?.command ?? "";
  } catch {
    return "";
  }
}

if (import.meta.main) {
  const reason = gateFor(commandFrom(await Bun.stdin.text()));
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
