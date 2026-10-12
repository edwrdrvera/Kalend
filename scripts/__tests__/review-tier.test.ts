import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { maxLowTierLines, maxTrivialLines, prTier, reviewTier, tierOf } from "../review-tier";

describe("tierOf", () => {
  test.each([
    "src/app/api/tasks/route.ts",
    "src/lib/api/task-body.ts",
    "src/lib/supabase/server.ts",
    "src/db/schema/tasks.ts",
    "drizzle/0007_spaces.sql",
    "src/proxy.ts",
    "eslint.config.mjs",
    "eslint-rules/scoped-query.mjs",
    "package.json",
    "bun.lock",
    "next.config.ts",
    "src/app/api/CLAUDE.md",
  ])("%s is high", (file) => {
    expect(tierOf(file)).toBe("high");
  });

  test.each([
    "src/hooks/useTasks.ts",
    "src/lib/time-grid-layout.ts",
    "src/lib/api.ts",
    "src/app/(app)/calendar/page.tsx",
    "src/test-utils/mock-db.ts",
    "some/unknown/file.ts",
    ".github/workflows/ci.yml",
    "scripts/review-tier.ts",
    ".claude/skills/code-review/SKILL.md",
    "src/components/Calendar.tsx",
    "src/components/TimeGrid.tsx",
    "src/app/globals.css",
  ])("%s is medium", (file) => {
    expect(tierOf(file)).toBe("medium");
  });

  test.each([
    "src/components/TaskList.tsx",
    "src/components/__tests__/TaskList.test.tsx",
    "src/components/WeekGrid.tsx",
    "docs/code-style.md",
    "public/logo.svg",
    "CLAUDE.md",
    "AGENTS.md",
    "guides/agent-rules.md",
    "guides/agents/domain.md",
  ])("%s is low", (file) => {
    expect(tierOf(file)).toBe("low");
  });
});

describe("reviewTier", () => {
  test("takes the riskiest file's tier", () => {
    expect(reviewTier(["src/components/TaskList.tsx", "src/hooks/useTasks.ts", "src/app/api/tasks/route.ts"])).toBe("high");
    expect(reviewTier(["src/components/TaskList.tsx", "src/hooks/useTasks.ts"])).toBe("medium");
    expect(reviewTier(["src/components/TaskList.tsx", "README.md"])).toBe("low");
  });

  test("an empty diff is low", () => {
    expect(reviewTier([])).toBe("low");
  });
});

describe("prTier", () => {
  const file = (path: string, additions: number) => ({ path, additions, deletions: 0 });

  test("a small diff with no high-tier file is trivial, whatever its folder", () => {
    expect(prTier([file("src/components/TaskList.tsx", maxTrivialLines - 1)])).toBe("trivial");
    expect(prTier([file("src/hooks/useTasks.ts", maxTrivialLines - 1)])).toBe("trivial");
  });

  test("a high-tier file is never trivial, however small", () => {
    expect(prTier([file("src/proxy.ts", 1)])).toBe("high");
  });

  test("a mid-sized low diff stays low", () => {
    expect(prTier([file("src/components/TaskList.tsx", maxLowTierLines)])).toBe("low");
  });

  test("a low diff over the line limit becomes medium", () => {
    expect(prTier([file("src/components/TaskList.tsx", maxLowTierLines), { path: "README.md", additions: 0, deletions: 1 }])).toBe("medium");
  });

  test("size never lowers a large high diff", () => {
    expect(prTier([file("src/proxy.ts", 900)])).toBe("high");
  });
});

describe("the review:tier command", () => {
  const script = join(import.meta.dir, "..", "review-tier.ts");
  const repos: string[] = [];
  afterAll(() => repos.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  function git(dir: string, ...args: string[]) {
    const result = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { cwd: dir });
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  }

  function repoWithDbFile(): string {
    const dir = mkdtempSync(join(tmpdir(), "review-tier-"));
    repos.push(dir);
    mkdirSync(join(dir, "src/db/schema"), { recursive: true });
    mkdirSync(join(dir, "src/lib"), { recursive: true });
    writeFileSync(join(dir, "src/db/schema/x.ts"), Array.from({ length: 30 }, (_, i) => `export const v${i} = ${i};\n`).join(""));
    git(dir, "init", "-q");
    git(dir, "add", ".");
    git(dir, "commit", "-qm", "base");
    git(dir, "mv", "src/db/schema/x.ts", "src/lib/x.ts");
    return dir;
  }

  function tierLine(dir: string): string {
    return Bun.spawnSync(["bun", script, "HEAD~1"], { cwd: dir }).stdout.toString().split("\n")[0];
  }

  test("a pure move out of src/db is high", () => {
    const dir = repoWithDbFile();
    git(dir, "commit", "-qm", "move");
    expect(tierLine(dir)).toStartWith("Review tier: high");
  });

  test("a move out of src/db with a small edit is high", () => {
    const dir = repoWithDbFile();
    writeFileSync(join(dir, "src/lib/x.ts"), "export const edited = 1;\n", { flag: "a" });
    git(dir, "commit", "-qam", "move and edit");
    expect(tierLine(dir)).toStartWith("Review tier: high");
  });
});
