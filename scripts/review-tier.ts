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

if (import.meta.main) {
  const base = process.argv[2] ?? "origin/develop";
  const diff = Bun.spawnSync(["git", "diff", "--name-only", `${base}...HEAD`]);
  if (diff.exitCode !== 0) {
    console.error(diff.stderr.toString());
    process.exit(1);
  }
  const files = diff.stdout.toString().split("\n").filter(Boolean);
  console.log(`Review tier: ${reviewTier(files)}`);
  for (const file of files) console.log(`  ${tierOf(file).padEnd(6)} ${file}`);
}
