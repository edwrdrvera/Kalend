import { describe, expect, it } from "bun:test";
import { ESLint } from "eslint";
import { join } from "node:path";

// Lints source strings through the real eslint.config.mjs, so a case fails if
// a file pattern stops matching or a rule stops seeing a form of the shortcut.
const repoRoot = join(import.meta.dir, "..", "..");
const eslint = new ESLint({ cwd: repoRoot });

const BOUNDARY_RULES = new Set([
  "no-restricted-imports",
  "no-restricted-syntax",
  "no-restricted-globals",
  "no-restricted-properties",
  "@eslint-community/eslint-comments/no-restricted-disable",
  "@eslint-community/eslint-comments/no-use",
  "access-control/scoped-query",
]);

async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages
    .filter((m) => m.ruleId !== null && BOUNDARY_RULES.has(m.ruleId))
    .map((m) => `${m.ruleId}: ${m.message}`);
}

const importOf = (source: string) => `import x from "${source}";\nexport default x;\n`;

const blocked: [string, string, string][] = [
  ["component imports the db client", "src/components/Example.tsx", importOf("@/db")],
  ["component imports a db schema", "src/components/landing/Example.tsx", importOf("@/db/schema/tasks")],
  ["component imports db by relative path", "src/components/Example.tsx", importOf("../db")],
  ["component imports the server supabase client", "src/components/Example.tsx", importOf("../../lib/supabase/server")],
  ["component imports a server module with its extension", "src/components/Example.tsx", importOf("@/lib/supabase/server.ts")],
  ["hook imports the auth helper", "src/hooks/useExample.ts", importOf("@/lib/supabase/auth-user")],
  ["hook imports the session middleware", "src/hooks/useExample.ts", importOf("@/lib/supabase/middleware")],
  ["page imports drizzle", "src/app/(app)/app/page.tsx", importOf("drizzle-orm")],
  ["page imports next/headers", "src/app/(marketing)/page.tsx", importOf("next/headers")],
  ["page imports the route wrapper", "src/app/(marketing)/page.tsx", importOf("@/lib/api/route-handler")],
  ["page in a new route folder imports the db", "src/app/newroute/page.tsx", importOf("@/db")],
  ["root layout imports the db", "src/app/layout.tsx", importOf("@/db")],
  ["shared lib file imports the db", "src/lib/server-helper.ts", importOf("@/db")],
  ["component imports the db dynamically", "src/components/Example.tsx", `export const load = () => import("@/db");\n`],
  ["component requires the db", "src/components/Example.tsx", `export const db = require("@/db");\n`],
  ["component writes through the request helper", "src/components/Example.tsx", `import { mutateResource } from "@/lib/api";\nexport const m = mutateResource;\n`],
  ["component calls fetch", "src/components/Example.tsx", `export const load = () => fetch("/api/tasks");\n`],
  ["page in a new route folder calls fetch", "src/app/newroute/page.tsx", `export const load = () => fetch("/api/tasks");\n`],
  ["shared lib file calls fetch", "src/lib/example.ts", `export const load = () => fetch("/api/tasks");\n`],
  ["component calls window.fetch", "src/components/Example.tsx", `export const load = () => window.fetch("/api/tasks");\n`],
  ["component calls globalThis.fetch", "src/components/Example.tsx", `export const load = () => globalThis.fetch("/api/tasks");\n`],
  ["component aliases globalThis", "src/components/Example.tsx", `const g = globalThis;\nexport const load = () => g.fetch("/api/tasks");\n`],
  ["component destructures fetch from window", "src/components/Example.tsx", `const { fetch: f } = window;\nexport const load = () => f("/api/tasks");\n`],
  ["component uses XMLHttpRequest", "src/components/Example.tsx", `export const x = () => new XMLHttpRequest();\n`],
  ["component uses sendBeacon", "src/components/Example.tsx", `export const b = () => navigator.sendBeacon("/api/tasks");\n`],
  ["disable comment on a boundary rule", "src/components/Example.tsx", `// eslint-disable-next-line no-restricted-imports\n${importOf("@/db")}`],
  ["blanket disable comment", "src/components/Example.tsx", `/* eslint-disable */\n${importOf("@/db")}`],
  ["inline rule config comment", "src/components/Example.tsx", `/* eslint no-restricted-imports: off */\n${importOf("@/db")}`],
  ["route imports React", "src/app/api/tasks/route.ts", importOf("react")],
  ["route imports a component by alias", "src/app/api/tasks/route.ts", importOf("@/components/Calendar")],
  ["route imports the components folder", "src/app/api/tasks/route.ts", importOf("@/components")],
  ["route imports a hook", "src/app/api/tasks/route.ts", importOf("@/hooks/useTasks")],
  ["route imports the hooks folder", "src/app/api/tasks/route.ts", importOf("@/hooks")],
  ["route imports a component by relative path", "src/app/api/tasks/route.ts", importOf("../../../components/Calendar")],
  ["server helper imports React", "src/lib/api/task-body.ts", importOf("react")],
  ["component reads a table with the browser supabase client", "src/components/Example.tsx", `import { createClient } from "@/lib/supabase/client";\nexport const load = () => createClient().from("tasks").select("*");\n`],
  ["shared lib file writes a table through a supabase variable", "src/lib/example.ts", `import { createClient } from "@/lib/supabase/client";\nconst supabase = createClient();\nexport const drop = () => supabase.from("tasks").delete();\n`],
  ["component calls a database function", "src/components/Example.tsx", `import { createClient } from "@/lib/supabase/client";\nexport const run = () => createClient().rpc("reset");\n`],
  ["component uses supabase storage", "src/components/Example.tsx", `import { createClient } from "@/lib/supabase/client";\nexport const files = () => createClient().storage;\n`],
  ["hook reads a table with the browser supabase client", "src/hooks/useExample.ts", `import { createClient } from "@/lib/supabase/client";\nexport const load = () => createClient().from("tasks").select("*");\n`],
  ["request helper uses supabase storage", "src/lib/api.ts", `import { createClient } from "@/lib/supabase/client";\nconst supabase = createClient();\nexport const files = () => supabase.storage;\n`],
  ["disable comment on the user-scoping rule", "src/app/api/tasks/route.ts", `import { db } from "@/db";\nimport { tasks } from "@/db/schema/tasks";\nimport { eq } from "drizzle-orm";\n// eslint-disable-next-line access-control/scoped-query\nexport const one = (id: string) => db.select().from(tasks).where(eq(tasks.id, id));\n`],
  ["component imports a test helper", "src/components/Example.tsx", importOf("@/test-utils/mock-db")],
  ["db helper lists every task", "src/db/queries.ts", `import { db } from "@/db";\nimport { tasks } from "@/db/schema/tasks";\nexport const all = () => db.select().from(tasks);\n`],
  ["tsx route lists every task", "src/app/api/tasks/route.tsx", `import { db } from "@/db";\nimport { tasks } from "@/db/schema/tasks";\nexport const all = () => db.select().from(tasks);\n`],
  ["route lists every task", "src/app/api/tasks/route.ts", `import { db } from "@/db";\nimport { tasks } from "@/db/schema/tasks";\nexport const all = () => db.select().from(tasks);\n`],
  ["component opens a WebSocket", "src/components/Example.tsx", `export const ws = () => new WebSocket("wss://example.com");\n`],
  ["component imports an HTTP library", "src/components/Example.tsx", importOf("axios")],
  ["server helper runs an unscoped task query", "src/lib/api/helper.ts", `import { db } from "@/db";\nimport { tasks } from "@/db/schema/tasks";\nimport { eq } from "drizzle-orm";\nexport const one = (id: string) => db.select().from(tasks).where(eq(tasks.id, id));\n`],
];

const allowed: [string, string, string][] = [
  ["component imports wire types and utils", "src/components/Example.tsx", `import type { CalendarTask } from "@/lib/calendar-types";\nimport { cn } from "@/lib/utils";\nexport type T = CalendarTask;\nexport const c = cn;\n`],
  ["component imports the browser supabase client", "src/components/Example.tsx", importOf("@/lib/supabase/client")],
  ["component reads window size", "src/components/Example.tsx", `export const w = () => window.innerWidth;\n`],
  ["component disables a React hooks rule", "src/components/Example.tsx", `import { useEffect } from "react";\nexport function C({ k }: { k: string }) {\n  useEffect(() => {\n    void k;\n  }, []); // eslint-disable-line react-hooks/exhaustive-deps\n  return null;\n}\n`],
  ["hook calls fetch", "src/hooks/useExample.ts", `export const load = () => fetch("/api/tasks");\n`],
  ["hook writes through the request helper", "src/hooks/useExample.ts", `import { mutateResource } from "@/lib/api";\nexport const m = mutateResource;\n`],
  ["request helper calls fetch", "src/lib/api.ts", `export const load = () => fetch("/api/tasks");\n`],
  ["route imports the db", "src/app/api/tasks/route.ts", importOf("@/db")],
  ["route calls fetch", "src/app/api/tasks/route.ts", `export const load = () => fetch("https://example.com");\n`],
  ["server helper calls fetch", "src/lib/api/event-body.ts", `export const load = () => fetch("https://example.com");\n`],
  ["component signs out with the browser supabase client", "src/components/Example.tsx", `import { createClient } from "@/lib/supabase/client";\nexport const out = () => createClient().auth.signOut();\n`],
  ["component uses typed-array and stream from", "src/components/Example.tsx", `export const a = (x: number[]) => [Int32Array.from(x), Float64Array.from(x), Uint8ClampedArray.from(x)];\n`],
  ["component reads a storage property that is not supabase", "src/components/Example.tsx", `export const q = (settings: { storage: string }) => [settings.storage, navigator.storage];\n`],
  ["component uses Temporal and Observable from", "src/components/Example.tsx", `declare const Temporal: { PlainDate: { from(s: string): unknown } };\ndeclare const Observable: { from(x: unknown): unknown };\nexport const d = () => [Temporal.PlainDate.from("2026-09-26"), Observable.from([1])];\n`],
  ["component reads storage off a settings hook or query client", "src/components/Example.tsx", `declare function useSettings(): { storage: string };\ndeclare const queryClient: { storage: string };\nexport const s = () => [useSettings().storage, queryClient.storage];\n`],
  ["component uses Array.from", "src/components/Example.tsx", `export const list = (s: Set<string>) => Array.from(s);\n`],
  ["component imports a type from a server module", "src/components/Example.tsx", `import type { TaskPatch } from "@/lib/api/task-body";\nexport type P = TaskPatch;\n`],
  ["component imports a type from the request helper", "src/components/Example.tsx", `import type { MutationResponse } from "@/lib/api";\nexport type R = MutationResponse<string>;\n`],
  ["route imports a third-party package named components", "src/app/api/tasks/route.ts", importOf("@react-email/components")],
];

describe("boundary rules report each shortcut", () => {
  for (const [label, filePath, code] of blocked) {
    it(label, async () => {
      expect(await boundaryErrors(filePath, code)).not.toEqual([]);
    });
  }
});

describe("boundary rules allow the paved path", () => {
  for (const [label, filePath, code] of allowed) {
    it(label, async () => {
      expect(await boundaryErrors(filePath, code)).toEqual([]);
    });
  }
});

// A same-line disable that names both a boundary rule and the comment guard
// silences both, and no lint setting can see it, so scan the real tree instead.
describe("no inline comment switches off a boundary rule", () => {
  it("src has no disable comment naming a boundary rule or the comment guard", async () => {
    const pattern = /eslint-(disable|enable)[^\n]*(no-restricted-(imports|syntax|globals|properties)|eslint-comments\/|access-control\/)/;
    const offenders: string[] = [];
    for await (const path of new Bun.Glob("src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}").scan(repoRoot)) {
      const lines = (await Bun.file(join(repoRoot, path)).text()).split("\n");
      lines.forEach((line, i) => {
        if (pattern.test(line)) offenders.push(`${path}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
