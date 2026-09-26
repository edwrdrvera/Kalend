import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import accessControl from "./eslint-rules/scoped-query.mjs";

// Files that only ever run on the server. Everything else under src/ can end
// up in a browser bundle, so a new folder is covered without editing this file.
const serverFiles = [
  "src/app/api/**",
  "src/lib/api/**",
  "src/lib/supabase/{server,auth-user,middleware}.ts",
  "src/db/**",
  "src/proxy.ts",
];
const testFiles = ["**/__tests__/**", "src/test-utils/**"];
const networkFiles = ["src/hooks/**", "src/lib/api.ts"];

// Written with [/] instead of an escaped slash so the same source works inside
// an esquery selector for dynamic import().
const serverOnly =
  "^(drizzle-orm|postgres|next[/]headers)([/]|$)|(^|[/])(db|supabase[/](server|auth-user|middleware))([/.]|$)|(^|[/])api[/]";
const serverOnlyMessage =
  "Server-only module. Browser code reads and changes data through a hook in src/hooks that calls an /api route; server code belongs under src/app/api.";
const networkMessage =
  "Network calls live in a hook in src/hooks (use mutateResource from @/lib/api for writes).";

const serverImportSyntax = [
  { selector: `ImportExpression[source.value=/${serverOnly}/]`, message: serverOnlyMessage },
  { selector: "CallExpression[callee.name='require']", message: "Use a static import so the import rules can check it." },
];

// The browser Supabase client is for sign-in only; table reads and writes from
// it skip the /api parsers and Space ownership checks. Hooks run in the browser
// too, so this applies to them as well.
const supabaseDataMessage =
  "The browser Supabase client is for sign-in only. Read and change data through an /api route (mutateResource from @/lib/api).";
const browserSyntax = [
  ...serverImportSyntax,
  {
    selector:
      "CallExpression[callee.property.name=/^(from|rpc|schema|channel)$/][callee.object.name!=/^(Array|Buffer|Object|Iterator|ReadableStream|[A-Za-z0-9]*Array)$/]",
    message: supabaseDataMessage,
  },
  {
    selector:
      "MemberExpression[property.name='storage'][object.type='CallExpression'], MemberExpression[property.name='storage'][object.name=/supabase|client/i]",
    message: supabaseDataMessage,
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce the per-user data-scoping invariant on the API route handlers,
  // the access-control boundary (see src/app/api/CLAUDE.md). The db client
  // bypasses RLS, so every query over a user-owned table must carry its
  // owner filter; this rule fails the build when one is missing.
  {
    files: ["src/app/api/**/*.{ts,mts}", "src/lib/api/**/*.{ts,mts}"],
    plugins: { "access-control": accessControl },
    rules: { "access-control/scoped-query": "error" },
  },
  // Browser code reaches data only through the hooks in src/hooks, which
  // call /api. The route handlers own the database and auth, so browser code
  // that imports them skips the user_id scoping those handlers guarantee.
  {
    files: networkFiles,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ regex: serverOnly, message: serverOnlyMessage, allowTypeImports: true }],
      }],
      "no-restricted-syntax": ["error", ...browserSyntax],
    },
  },
  {
    files: ["src/**"],
    ignores: [...serverFiles, ...testFiles, ...networkFiles],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { regex: serverOnly, message: serverOnlyMessage, allowTypeImports: true },
          { regex: "(^|[/])api(\\.ts)?$", message: networkMessage, allowTypeImports: true },
          { regex: "^(axios|ky|ofetch|got|superagent|node-fetch|cross-fetch)([/]|$)", message: networkMessage },
        ],
      }],
      "no-restricted-syntax": ["error",
        ...browserSyntax,
        {
          selector: "VariableDeclarator[init.type='Identifier'][init.name=/^(window|globalThis|self)$/]",
          message: networkMessage,
        },
      ],
      "no-restricted-globals": ["error",
        ...["fetch", "XMLHttpRequest", "EventSource", "WebSocket"].map((name) => ({ name, message: networkMessage })),
      ],
      "no-restricted-properties": ["error",
        ...["window", "globalThis", "self"].map((object) => ({ object, property: "fetch", message: networkMessage })),
        { object: "navigator", property: "sendBeacon", message: networkMessage },
      ],
    },
  },
  {
    files: serverFiles,
    ignores: testFiles,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^react(-dom)?([/]|$)|^(@|[.]{1,2})[/](.*[/])?(components|hooks)([/]|$)",
          message: "Server code returns JSON. Put shared logic in src/lib and keep React out of it.",
        }],
      }],
    },
  },
  // The boundary rules above only hold if they cannot be switched off inline.
  {
    files: ["src/**"],
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@eslint-community/eslint-comments/no-restricted-disable": ["error",
        "no-restricted-imports", "no-restricted-syntax", "no-restricted-globals", "no-restricted-properties",
        "access-control/scoped-query",
      ],
      "@eslint-community/eslint-comments/no-use": ["error", { allow: ["eslint-disable-line", "eslint-disable-next-line"] }],
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
