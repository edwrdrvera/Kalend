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
const mediumPatterns = [/^\.claude\//];

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

// Low tier skips the fresh-session review, so a large low diff (many
// component files at once) is bumped to medium: size alone can hide a logic bug.
export const maxLowTierLines = 150;

export type ChangedFile = { path: string; additions: number; deletions: number };

export function prTier(files: readonly ChangedFile[]): Tier {
  const tier = reviewTier(files.map((file) => file.path));
  const lines = files.reduce((sum, file) => sum + file.additions + file.deletions, 0);
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
  const bumped = tier !== reviewTier(files.map((file) => file.path));
  console.log(`Review tier: ${tier}${bumped ? ` (low files, but ${lines} changed lines is over ${maxLowTierLines})` : ""}`);
  for (const file of files) console.log(`  ${tierOf(file.path).padEnd(6)} ${file.path}`);
}
