import { describe, expect, it } from "bun:test";
import { ESLint } from "eslint";

// Lints source strings through the real eslint.config.mjs, so a case fails if
// a file pattern stops matching or a rule stops seeing a form of the shortcut.
const eslint = new ESLint();

const BOUNDARY_RULES = new Set([
  "no-restricted-imports",
  "no-restricted-syntax",
  "no-restricted-globals",
  "no-restricted-properties",
  "@eslint-community/eslint-comments/no-restricted-disable",
  "@eslint-community/eslint-comments/no-use",
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
