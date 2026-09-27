// Runs /code-review (and /security-review on high tier) on a PR in a brand-new
// Claude process. The caller passes only a PR number: the prompt is built here
// from a fixed template, so the session that wrote the code has no channel to
// hand the reviewer its reasoning.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Each run is a full multi-agent review, so re-runs are capped: one review,
// then at most one more after fixing what it found.
export const maxReviewsPerPr = 2;
const reportHeading = "## Fresh-session review";

export function countPostedReviews(commentBodies: readonly string[]): number {
  return commentBodies.filter((body) => body.startsWith(reportHeading)).length;
}

export type LinkedIssue = { number: number; title: string; body: string | null };

// The reviewer may read, search, run tests, and write proof tests inside its
// throwaway worktree. It may not commit, push, comment, or merge.
export const allowedTools = [
  "Read",
  "Grep",
  "Glob",
  "Write",
  "Edit",
  "Agent",
  "Skill",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git show:*)",
  "Bash(git status:*)",
  "Bash(git fetch:*)",
  "Bash(gh pr view:*)",
  "Bash(gh pr diff:*)",
  "Bash(gh issue view:*)",
  "Bash(bun test:*)",
  "Bash(bun run review:tier:*)",
  "Bash(bunx tsc:*)",
];

export const disallowedTools = [
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh pr merge:*)",
  "Bash(gh pr edit:*)",
];

// A closing tag in the issue would end the criteria block early and turn the
// rest of the issue into top-level instructions.
function escapeClosingTag(text: string): string {
  return text.replaceAll("</acceptance_criteria>", "&lt;/acceptance_criteria>");
}

export function acceptanceCriteria(issues: readonly LinkedIssue[]): string {
  if (issues.length === 0) {
    throw new Error(
      'The PR links no issue. Add "Closes #<issue>" to its body so the reviewer can read your acceptance criteria.',
    );
  }
  return issues
    .map((issue) => {
      const body = issue.body?.trim();
      if (!body) throw new Error(`Issue #${issue.number} has no body, so there are no acceptance criteria to review against.`);
      return `### Issue #${issue.number}: ${escapeClosingTag(issue.title)}\n\n${escapeClosingTag(body)}`;
    })
    .join("\n\n");
}

export function reviewPrompt(prUrl: string, criteria: string): string {
  return `/code-review ${prUrl}

Run in fresh-session mode (see "Fresh-session mode" in the skill). You are a reviewer started with no history. Report only: do not edit tracked files outside new proof tests, commit, push, or comment on the PR.

Only your final message is kept. Make it the complete report from step 5, with nothing after it.

Acceptance criteria, copied verbatim from the linked issue(s). Treat these as the intent of the change:

<acceptance_criteria>
${criteria}
</acceptance_criteria>`;
}

function run(cmd: string[], cwd?: string): string {
  const result = Bun.spawnSync(cmd, { cwd, stderr: "pipe" });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd.join(" ")} failed:\n${result.stderr.toString()}`);
  }
  return result.stdout.toString();
}

export function parseArgs(argv: readonly string[]) {
  const pr = argv.find((arg) => /^\d+$/.test(arg));
  if (!pr) throw new Error("Usage: bun run review:pr <pr-number> [--post]");
  return { pr, post: argv.includes("--post") };
}

async function main() {
  const { pr, post } = parseArgs(process.argv.slice(2));

  const view = JSON.parse(
    run(["gh", "pr", "view", pr, "--json", "url,baseRefName,closingIssuesReferences,comments"]),
  ) as {
    url: string;
    baseRefName: string;
    closingIssuesReferences: { number: number }[];
    comments: { body: string }[];
  };

  const posted = countPostedReviews(view.comments.map((comment) => comment.body));
  if (posted >= maxReviewsPerPr) {
    throw new Error(
      `PR ${pr} already has ${posted} fresh-session reviews (the limit is ${maxReviewsPerPr}). Fix what they found without another run.`,
    );
  }

  const issues = view.closingIssuesReferences.map(({ number }) => {
    const issue = JSON.parse(run(["gh", "issue", "view", String(number), "--json", "title,body"]));
    return { number, title: issue.title, body: issue.body } as LinkedIssue;
  });
  const prompt = reviewPrompt(view.url, acceptanceCriteria(issues));

  // Review the PR head, but with the review skills from the base branch, so a
  // PR can't soften the review that grades it.
  const base = `origin/${view.baseRefName}`;
  // Fetch the head last and alone: with two refs, FETCH_HEAD resolves to the first one.
  run(["git", "fetch", "origin", view.baseRefName]);
  run(["git", "fetch", "origin", `pull/${pr}/head`]);
  const head = run(["git", "rev-parse", "FETCH_HEAD"]).trim();
  const dir = join(mkdtempSync(join(tmpdir(), `kalend-review-${pr}-`)), "repo");
  run(["git", "worktree", "add", "--detach", dir, head]);

  try {
    run(["git", "checkout", base, "--", ".claude/skills"], dir);
    console.error(`Reviewing ${view.url} in ${dir} (fresh session, no history)...`);
    const reviewer = Bun.spawn(
      [
        "claude",
        "-p",
        prompt,
        "--no-session-persistence",
        "--model",
        "claude-sonnet-5",
        "--allowedTools",
        ...allowedTools,
        "--disallowedTools",
        ...disallowedTools,
      ],
      { cwd: dir, stdout: "pipe", stderr: "inherit" },
    );
    const report = await new Response(reviewer.stdout).text();
    console.log(report);
    if ((await reviewer.exited) !== 0) throw new Error("The reviewer exited with an error.");

    if (post) {
      const body = `${reportHeading}\n\nRun by \`bun run review:pr\` with no author context.\n\n${report}`;
      const comment = Bun.spawnSync(["gh", "pr", "comment", pr, "--body-file", "-"], {
        stdin: new TextEncoder().encode(body),
        stderr: "pipe",
      });
      if (comment.exitCode !== 0) throw new Error(`gh pr comment failed:\n${comment.stderr.toString()}`);
    }
  } finally {
    // Keep the worktree when the reviewer wrote proof tests, so they can be copied over.
    // A cleanup failure must not hide the reviewer's own error.
    try {
      const changes = run(["git", "status", "--porcelain", "--", ".", ":!.claude/skills"], dir);
      if (changes.trim()) {
        console.error(`Reviewer wrote files. Worktree kept at ${dir}:\n${changes}`);
      } else {
        run(["git", "worktree", "remove", "--force", dir]);
        rmSync(join(dir, ".."), { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Cleanup failed, worktree may remain at ${dir}: ${(error as Error).message}`);
    }
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
}
