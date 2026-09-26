import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import accessControl from "./eslint-rules/scoped-query.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce the per-user data-scoping invariant on the API route handlers,
  // the access-control boundary (see src/app/api/CLAUDE.md). The db client
  // bypasses RLS, so every query over a user-owned table must carry its
  // owner filter; this rule fails the build when one is missing.
  {
    files: ["src/app/api/**/*.ts"],
    plugins: { "access-control": accessControl },
    rules: { "access-control/scoped-query": "error" },
  },
  // Browser code reaches data only through the hooks in src/hooks, which
  // call /api. The route handlers own the database and auth, so a component
  // that imports them skips the user_id scoping those handlers guarantee.
  {
    files: ["src/components/**", "src/hooks/**", "src/app/(app)/**", "src/app/(marketing)/**"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/db", "@/db/*", "drizzle-orm", "drizzle-orm/*", "postgres",
            "@/lib/supabase/server", "@/lib/supabase/auth-user", "@/lib/api/route-handler",
            "**/db", "**/db/*", "**/supabase/server", "**/supabase/auth-user", "**/api/route-handler",
          ],
          message: "Server-only module. Read or change data through a hook in src/hooks that calls an /api route.",
        }],
      }],
    },
  },
  {
    files: ["src/components/**", "src/app/(app)/**", "src/app/(marketing)/**", "src/lib/**"],
    ignores: ["**/__tests__/**", "src/lib/api.ts"],
    rules: {
      "no-restricted-globals": ["error", {
        name: "fetch",
        message: "Network calls live in a hook in src/hooks (use mutateResource from @/lib/api for writes).",
      }],
      "no-restricted-properties": ["error",
        ...["window", "globalThis", "self"].map((object) => ({
          object,
          property: "fetch",
          message: "Network calls live in a hook in src/hooks (use mutateResource from @/lib/api for writes).",
        })),
      ],
    },
  },
  {
    files: ["src/app/api/**"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["react", "react-dom", "react/*", "react-dom/*", "@/components/*", "@/hooks/*"],
          message: "Route handlers return JSON. Put shared logic in src/lib and keep React out of src/app/api.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full checkouts of other branches.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
