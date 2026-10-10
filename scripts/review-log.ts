// Records what happened to each fresh-session review finding, so changes to
// the review prompt and skills can be judged by results instead of by feel.
//   bun run review:log add <pr> <severity> <outcome> <finding...>
//   bun run review:log stats
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { type PrComment, postedReviews, reportHeading, unknownReviewerVersion } from "./review-pr";
import { type ChangedFile, prTier } from "./review-tier";

export const logPath = "guides/review-log.tsv";
const header = "pr\tdate\ttier\treviewer_version\tfinding\tseverity\toutcome";

export const severities = ["high", "medium", "low"] as const;
// "missed" is a bug found later in code a review passed. It's the number that
// matters most, and no reviewer reports it, so it's logged by hand.
export const outcomes = ["real-fixed", "real-deferred", "false-positive", "ignored", "missed"] as const;

export type Row = {
  pr: string;
  date: string;
  tier: string;
  reviewerVersion: string;
  finding: string;
  severity: string;
  outcome: string;
};

const stampedVersion = new RegExp(`^${reportHeading}\\n\\n[^\\n]*Reviewer version: \`([0-9a-f]{4,40})\``);

// The reviewer version comes from the posted review, not from the base branch at
// logging time, so a finding logged after the reviewer changed keeps its own version.
export function reviewerVersionFrom(comments: readonly PrComment[], reviewer: string): string {
  const latest = postedReviews(comments, reviewer).at(-1)?.body;
  return latest?.match(stampedVersion)?.[1] ?? unknownReviewerVersion;
}

export function formatRow(row: Row): string {
  const finding = row.finding.replace(/\s+/g, " ").trim();
  return [row.pr, row.date, row.tier, row.reviewerVersion, finding, row.severity, row.outcome].join("\t");
}

export function parseLog(text: string): Row[] {
  return text
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [pr, date, tier, reviewerVersion, finding, severity, outcome] = line.split("\t");
      return { pr, date, tier, reviewerVersion, finding, severity, outcome };
    });
}

export type VersionStats = { version: string; prs: number; findings: number; real: number; falsePositives: number; missed: number };

export function stats(rows: readonly Row[]): VersionStats[] {
  const byVersion = new Map<string, Row[]>();
  for (const row of rows) byVersion.set(row.reviewerVersion, [...(byVersion.get(row.reviewerVersion) ?? []), row]);
  return [...byVersion].map(([version, group]) => {
    const reported = group.filter((row) => row.outcome !== "missed");
    return {
      version,
      prs: new Set(group.map((row) => row.pr)).size,
      findings: reported.length,
      real: reported.filter((row) => row.outcome.startsWith("real-")).length,
      falsePositives: reported.filter((row) => row.outcome === "false-positive").length,
      missed: group.length - reported.length,
    };
  });
}

export function parseAddArgs(argv: readonly string[]) {
  const [pr, severity, outcome, ...words] = argv;
  const usage = `Usage: bun run review:log add <pr> <${severities.join("|")}> <${outcomes.join("|")}> <finding...>`;
  if (!/^\d+$/.test(pr ?? "") || words.length === 0) throw new Error(usage);
  if (!(severities as readonly string[]).includes(severity)) throw new Error(`Unknown severity "${severity}". ${usage}`);
  if (!(outcomes as readonly string[]).includes(outcome)) throw new Error(`Unknown outcome "${outcome}". ${usage}`);
  return { pr, severity, outcome, finding: words.join(" ") };
}

function run(cmd: string[]): string {
  const result = Bun.spawnSync(cmd, { stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed:\n${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

function add(argv: readonly string[]) {
  const { pr, severity, outcome, finding } = parseAddArgs(argv);
  const { files, comments } = JSON.parse(run(["gh", "pr", "view", pr, "--json", "files,comments"])) as {
    files: ChangedFile[];
    comments: PrComment[];
  };
  const row: Row = {
    pr,
    date: new Date().toISOString().slice(0, 10),
    tier: prTier(files),
    reviewerVersion: reviewerVersionFrom(comments, run(["gh", "api", "user", "-q", ".login"])),
    finding,
    severity,
    outcome,
  };
  if (!existsSync(logPath)) writeFileSync(logPath, `${header}\n`);
  appendFileSync(logPath, `${formatRow(row)}\n`);
  console.log(`Logged: ${formatRow(row)}`);
}

function printStats() {
  const rows = existsSync(logPath) ? parseLog(readFileSync(logPath, "utf8")) : [];
  if (rows.length === 0) return console.log(`No rows in ${logPath} yet.`);
  console.log("version   PRs  findings  real  false+  missed  precision");
  for (const s of stats(rows)) {
    const precision = s.findings ? `${Math.round((s.real / s.findings) * 100)}%` : "n/a";
    console.log(
      `${s.version.padEnd(9)} ${String(s.prs).padStart(3)}  ${String(s.findings).padStart(8)}  ${String(s.real).padStart(4)}  ${String(s.falsePositives).padStart(6)}  ${String(s.missed).padStart(6)}  ${precision.padStart(9)}`,
    );
  }
}

if (import.meta.main) {
  try {
    const [command, ...rest] = process.argv.slice(2);
    if (command === "add") add(rest);
    else if (command === "stats") printStats();
    else throw new Error("Usage: bun run review:log add ... | bun run review:log stats");
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
