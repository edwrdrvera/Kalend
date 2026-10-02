export type Tier = "low" | "medium" | "high";

const tierRank: Record<Tier, number> = { low: 0, medium: 1, high: 2 };

// Data access, auth, schema, lint rules, and build config. A mistake here
// reaches every user or silently weakens the checks that catch mistakes.
const highPatterns = [
  /^src\/app\/api\//,
  /^src\/lib\/api\//,
  /^src\/lib\/supabase\//,
  /^src\/db\//,
  /^drizzle\//,
  /^src\/proxy\.ts$/,
  /^eslint\.config\.mjs$/,
  /^eslint-rules\//,
  /^(package\.json|bun\.lock|tsconfig\.json|next\.config\.ts|drizzle\.config\.ts)$/,
];

// Agent skills are Markdown but steer every review, so they skip the .md low rule.
// The calendar shell, the time grid and the global styles are medium too: they
// match the component and .css low rules, but a change there reaches nearly every screen.
const mediumPatterns = [
  /^\.claude\//,
  /^src\/components\/(Calendar|TimeGrid)\.tsx$/,
  /^src\/app\/globals\.css$/,
];

const lowPatterns = [/^src\/components\//, /\.css$/, /\.md$/, /^public\//];

export function tierOf(file: string): Tier {
  if (highPatterns.some((pattern) => pattern.test(file))) return "high";
  if (mediumPatterns.some((pattern) => pattern.test(file))) return "medium";
  if (lowPatterns.some((pattern) => pattern.test(file))) return "low";
  return "medium";
}

export function reviewTier(files: readonly string[]): Tier {
  return files.reduce<Tier>((tier, file) => {
    const next = tierOf(file);
    return tierRank[next] > tierRank[tier] ? next : tier;
  }, "low");
}

// A PR's tier also weighs its size. A small diff with no high-tier file is
// trivial: the whole diff reads faster than a report about it. A large low diff
// (many component files at once) is bumped to medium: size alone can hide a logic bug.
export const maxTrivialLines = 40;
export const maxLowTierLines = 150;

export type PrTier = "trivial" | Tier;
export type ChangedFile = { path: string; additions: number; deletions: number };

export function prTier(files: readonly ChangedFile[]): PrTier {
  const tier = reviewTier(files.map((file) => file.path));
  const lines = files.reduce((sum, file) => sum + file.additions + file.deletions, 0);
  if (tier !== "high" && lines < maxTrivialLines) return "trivial";
  return tier === "low" && lines > maxLowTierLines ? "medium" : tier;
}

if (import.meta.main) {
  const base = process.argv[2] ?? "origin/develop";
  const diff = Bun.spawnSync(["git", "diff", "--numstat", `${base}...HEAD`]);
  if (diff.exitCode !== 0) {
    console.error(diff.stderr.toString());
    process.exit(1);
  }
  // Binary files report "-" for both counts, which counts as 0 lines.
  const files = diff.stdout
    .toString()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, path] = line.split("\t");
      return { path, additions: Number(additions) || 0, deletions: Number(deletions) || 0 };
    });
  const lines = files.reduce((sum, file) => sum + file.additions + file.deletions, 0);
  const tier = prTier(files);
  const fileTier = reviewTier(files.map((file) => file.path));
  const why = tier === fileTier ? "" : ` (${fileTier} files, ${lines} changed lines)`;
  console.log(`Review tier: ${tier}${why}`);
  for (const file of files) console.log(`  ${tierOf(file.path).padEnd(6)} ${file.path}`);
}
