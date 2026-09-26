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
