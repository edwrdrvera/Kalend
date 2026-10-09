import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OLD_RING = "focus-visible:ring-ring/60";
const DROPPED = new Set(["focus-visible:ring-1", "focus-visible:outline-none", "outline-none"]);
const STRING_LITERAL = /(["'`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g;

/** Rewrites one class string. Returns it unchanged when it holds no old ring. */
export function rewriteClassString(classes: string): string {
  if (!classes.includes(OLD_RING)) return classes;
  const tokens = classes
    .split(/(\s+)/)
    .filter((token) => !DROPPED.has(token))
    .map((token) => (token === OLD_RING ? "focus-ring" : token));
  let out = tokens.join("").replace(/ {2,}/g, " ");
  if (!/^\s/.test(classes)) out = out.trimStart();
  if (!/\s$/.test(classes)) out = out.trimEnd();
  return out;
}

export function rewriteSource(source: string): string {
  return source.replace(STRING_LITERAL, (match, quote: string, body: string) => {
    const next = rewriteClassString(body);
    return next === body ? match : `${quote}${next}${quote}`;
  });
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) yield path;
  }
}

if (import.meta.main) {
  const targets = process.argv.length > 2 ? process.argv.slice(2) : [...sourceFiles("src")];
  for (const file of targets) {
    if (file.includes("components/ui/")) continue;
    const before = readFileSync(file, "utf8");
    const after = rewriteSource(before);
    if (after === before) continue;
    writeFileSync(file, after);
    console.log(`changed ${file}`);
  }
}
