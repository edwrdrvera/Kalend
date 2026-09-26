import { describe, expect, test } from "bun:test";
import { reviewTier, tierOf } from "../review-tier";

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
    ".github/workflows/ci.yml",
    "package.json",
    "bun.lock",
    "next.config.ts",
    "scripts/review-tier.ts",
    ".claude/skills/code-review/SKILL.md",
    "CLAUDE.md",
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
  ])("%s is medium", (file) => {
    expect(tierOf(file)).toBe("medium");
  });

  test.each([
    "src/components/TaskList.tsx",
    "src/components/__tests__/TaskList.test.tsx",
    "src/app/globals.css",
    "docs/code-style.md",
    "public/logo.svg",
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
