import { describe, expect, it } from "bun:test";
import { ESLint } from "eslint";

// Lints source strings through the real eslint.config.mjs, so these cases
// fail if a file glob stops matching (the route-group folders have parens).
const eslint = new ESLint();

async function ruleErrors(ruleId: string, filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === ruleId).map((m) => m.message);
}

const boundaryErrors = (filePath: string, code: string) =>
  ruleErrors("no-restricted-imports", filePath, code);

describe("only hooks and the shared request helper call fetch", () => {
  const code = `export const load = () => fetch("/api/tasks");\n`;

  for (const filePath of [
    "src/components/Example.tsx",
    "src/components/landing/WaitlistForm.tsx",
    "src/app/(app)/app/page.tsx",
    "src/app/(marketing)/page.tsx",
    "src/lib/example.ts",
  ]) {
    it(`reports fetch in ${filePath}`, async () => {
      expect(await ruleErrors("no-restricted-globals", filePath, code)).toEqual([
        expect.stringContaining("Network calls live in a hook"),
      ]);
    });
  }

  for (const call of ["window.fetch", "globalThis.fetch"]) {
    it(`reports ${call} in a component`, async () => {
      const errors = await ruleErrors(
        "no-restricted-properties",
        "src/components/Example.tsx",
        `export const load = () => ${call}("/api/tasks");\n`
      );
      expect(errors).toEqual([expect.stringContaining("Network calls live in a hook")]);
    });
  }

  for (const filePath of ["src/hooks/useTasks.ts", "src/lib/api.ts", "src/app/api/tasks/route.ts"]) {
    it(`allows fetch in ${filePath}`, async () => {
      expect(await ruleErrors("no-restricted-globals", filePath, code)).toEqual([]);
    });
  }
});

describe("browser code cannot import server-only modules", () => {
  const cases: [string, string][] = [
    ["src/components/Example.tsx", "@/db"],
    ["src/components/landing/Example.tsx", "@/db/schema/tasks"],
    ["src/hooks/useExample.ts", "@/lib/supabase/server"],
    ["src/hooks/useExample.ts", "@/lib/supabase/auth-user"],
    ["src/app/(app)/app/page.tsx", "drizzle-orm"],
    ["src/app/(marketing)/page.tsx", "@/lib/api/route-handler"],
    ["src/components/Example.tsx", "../db"],
    ["src/components/landing/Example.tsx", "../../lib/supabase/server"],
  ];

  for (const [filePath, source] of cases) {
    it(`${filePath} importing ${source}`, async () => {
      const errors = await boundaryErrors(filePath, `import x from "${source}";\nexport default x;\n`);
      expect(errors).toEqual([expect.stringContaining("Server-only module")]);
    });
  }

  it("allows wire types and client helpers", async () => {
    const code = `import type { CalendarTask } from "@/lib/calendar-types";\nimport { mutateResource } from "@/lib/api";\nexport type T = CalendarTask;\nexport const m = mutateResource;\n`;
    expect(await boundaryErrors("src/components/Example.tsx", code)).toEqual([]);
  });
});

describe("route handlers cannot import React code", () => {
  for (const source of ["react", "@/components/Calendar", "@/hooks/useTasks"]) {
    it(`src/app/api/tasks/route.ts importing ${source}`, async () => {
      const errors = await boundaryErrors("src/app/api/tasks/route.ts", `import x from "${source}";\nexport default x;\n`);
      expect(errors).toEqual([expect.stringContaining("Route handlers return JSON")]);
    });
  }

  it("allows the database client", async () => {
    const code = `import { db } from "@/db";\nexport const d = db;\n`;
    expect(await boundaryErrors("src/app/api/tasks/route.ts", code)).toEqual([]);
  });
});
