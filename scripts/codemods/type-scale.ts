import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Maps an arbitrary text size to the library type scale (plan Appendix E).
// text-xs and text-sm bring Tailwind's own line-heights, so a rewrite into
// them also gets leading-normal (1.5, the inherited body value), which keeps
// the line-height the arbitrary class had.
const SCALE: Record<string, string> = {
  "9px": "text-meta",
  "10px": "text-meta",
  "11px": "text-meta",
  "11.5px": "text-xs",
  "12px": "text-xs",
  "12.5px": "text-body",
  "13px": "text-body",
  "14px": "text-sm",
  "15px": "text-sm",
  "17px": "text-title",
  "20px": "text-title",
};
const COMPANIONED = new Set(["text-xs", "text-sm"]);
const SMALL_SIZES = new Set(["9px", "10px"]);
const SMALL_ALLOWED_FILES = ["src/components/TimeGrid.tsx", "src/components/MiniCalendar.tsx"];
const LANDING = /(^|\/)src\/components\/landing\//;
const STRING_LITERAL = /(["'`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g;
const ARBITRARY_TEXT = /((?:[^\s"'`{}()]*:)?)text-\[(\d+(?:\.\d+)?px)\]/g;

export interface RewriteResult {
  source: string;
  count: number;
}

function rewriteClassString(classes: string, keepSmall: boolean): { text: string; count: number } {
  let count = 0;
  const text = classes.replace(ARBITRARY_TEXT, (match, prefix: string, size: string) => {
    if (keepSmall && SMALL_SIZES.has(size)) return match;
    const target = SCALE[size];
    if (!target) return match;
    count += 1;
    const hasLeading = new RegExp(`(^|\\s)(${escape(prefix)})?leading-`).test(classes);
    if (COMPANIONED.has(target) && !hasLeading) return `${prefix}${target} ${prefix}leading-normal`;
    return `${prefix}${target}`;
  });
  return { text, count };
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rewrites every arbitrary px text size in a file's string literals. */
export function rewriteSource(source: string, file: string): RewriteResult {
  if (LANDING.test(file)) return { source, count: 0 };
  const keepSmall = SMALL_ALLOWED_FILES.some((allowed) => file.endsWith(allowed));
  let count = 0;
  const out = source.replace(STRING_LITERAL, (match, quote: string, body: string) => {
    const rewritten = rewriteClassString(body, keepSmall);
    count += rewritten.count;
    return rewritten.count === 0 ? match : `${quote}${rewritten.text}${quote}`;
  });
  return { source: out, count };
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) yield path;
  }
}

if (import.meta.main) {
  const roots = process.argv.length > 2 ? process.argv.slice(2) : ["src"];
  const files = roots.flatMap((root) => (statSync(root).isDirectory() ? [...sourceFiles(root)] : [root]));
  let total = 0;
  let changedFiles = 0;
  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const { source, count } = rewriteSource(before, file);
    if (count === 0) continue;
    writeFileSync(file, source);
    console.log(`${file} ${count}`);
    total += count;
    changedFiles += 1;
  }
  console.log(`total ${total} sites in ${changedFiles} files`);
}
