// Ambient declaration for plain (non-module) CSS side-effect imports, e.g.
// `import "./globals.css"` in src/app/layout.tsx.
//
// next-env.d.ts (via next/types/global.d.ts) only declares `*.module.css`,
// not plain `*.css`. That's normally invisible because `tsc` doesn't check
// side-effect imports by default — but TypeScript 6.0 flipped
// `noUncheckedSideEffectImports` to default `true`, so editors bundling
// TS 6.0+ (VS Code's built-in TypeScript, ahead of this repo's pinned
// `typescript@^5`) report it as an error even though `bunx tsc --noEmit`
// stays clean.
declare module "*.css";
