import { readFileSync } from "node:fs";

export type Mode = "light" | "dark";
type Ref = string | { token: string; alpha: number };
type Rgb = [number, number, number];

interface Pair {
  name: string;
  fg: Ref;
  bg: Ref;
  min: number;
  /** Opaque token under a translucent bg. Defaults to the bg itself. */
  over?: string;
  /** Whole-element opacity (fg and bg together) over `over`. */
  opacity?: number;
  /** A failure we know about and have not fixed yet. Printed as GAP, never fails the run. */
  knownGap?: string;
}

const COLOR_NAMES = ["blue", "green", "purple", "orange", "red", "indigo", "pink", "yellow", "teal"];

export function parseTokens(css: string): Record<Mode, Map<string, string>> {
  const tokens = { light: new Map<string, string>(), dark: new Map<string, string>() };
  for (const block of css.matchAll(/^(:root|\.dark)\s*\{([^}]*)\}/gm)) {
    const target = block[1] === ":root" ? tokens.light : tokens.dark;
    for (const [, name, value] of block[2]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) target.set(name!, value!.trim());
  }
  return tokens;
}

export function resolveToken(tokens: Record<Mode, Map<string, string>>, mode: Mode, name: string): string {
  let value = (mode === "dark" ? tokens.dark.get(name) : undefined) ?? tokens.light.get(name);
  for (let hops = 0; value?.startsWith("var("); hops++) {
    if (hops > 5) throw new Error(`token loop at ${name}`);
    const next: string = value.slice(4, -1).trim();
    value = (mode === "dark" ? tokens.dark.get(next) : undefined) ?? tokens.light.get(next);
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} is not a 6-digit hex in ${mode}: ${value}`);
  return value;
}

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const mix = (top: Rgb, under: Rgb, alpha: number): Rgb =>
  top.map((v, i) => v * alpha + under[i]! * (1 - alpha)) as Rgb;

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(toRgb(a)), luminance(toRgb(b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Reads a number out of a source file so a class change cannot drift from the check. */
function numberFrom(path: string, pattern: RegExp): number {
  const match = readFileSync(path, "utf8").match(pattern);
  if (!match) throw new Error(`${path} no longer matches ${pattern}`);
  return Number(match[1]);
}

/** The token the unchecked task checkbox border uses, read from its source so a class change cannot drift from the check. */
function checkboxBorderToken(): string {
  const source = readFileSync("src/components/TaskCheckbox.tsx", "utf8");
  const match = source.match(/(?<![:\w-])border-(muted-foreground|border|input)(?![\w/-])/);
  if (!match) throw new Error("src/components/TaskCheckbox.tsx has no solid border-<token> class on its unchecked box");
  return `--${match[1]}`;
}

export function buildPairs(): Pair[] {
  const switchAlpha = numberFrom("src/components/PanelAlertsTab.tsx", /"bg-muted-foreground\/(\d+)"/) / 100;
  const dimOpacity = numberFrom("src/lib/space-focus.ts", /"opacity-(\d+) transition-opacity/) / 100;
  const pairs: Pair[] = [
    { name: "Unchecked checkbox border on card", fg: checkboxBorderToken(), bg: "--card", min: 3 },
    { name: "Focus ring on card", fg: "--ring", bg: "--card", min: 3 },
    { name: "Focus ring on background", fg: "--ring", bg: "--background", min: 3 },
    { name: "Focus ring on muted", fg: "--ring", bg: "--muted", min: 3 },
    { name: "muted-foreground on muted", fg: "--muted-foreground", bg: "--muted", min: 4.5 },
    { name: "muted-foreground on card", fg: "--muted-foreground", bg: "--card", min: 4.5 },
    { name: "Create title placeholder (muted-foreground on popover)", fg: "--muted-foreground", bg: "--popover", min: 4.5 },
    { name: "White now label on --now-label", fg: "#ffffff", bg: "--now-label", min: 4.5 },
    { name: "Destructive text on card", fg: "--destructive", bg: "--card", min: 4.5 },
    { name: "Destructive text on popover", fg: "--destructive", bg: "--popover", min: 4.5 },
    {
      name: `Switch off-track (muted-foreground at ${switchAlpha * 100}%) on card`,
      fg: { token: "--muted-foreground", alpha: switchAlpha },
      bg: "--card",
      min: 3,
    },
  ];
  for (const color of COLOR_NAMES) {
    pairs.push({ name: `${color} event title on its fill`, fg: `--evt-${color}-fg`, bg: `--evt-${color}-bg`, min: 4.5 });
    pairs.push({
      name: `${color} event title on its fill, dimmed to ${dimOpacity * 100}%`,
      fg: `--evt-${color}-fg`,
      bg: `--evt-${color}-bg`,
      over: "--card",
      opacity: dimOpacity,
      min: 3,
    });
  }
  return pairs;
}

export interface Result {
  mode: Mode;
  pair: Pair;
  ratio: number;
  ok: boolean;
}

export function checkPairs(css: string, pairs: Pair[]): Result[] {
  const tokens = parseTokens(css);
  const results: Result[] = [];
  for (const mode of ["light", "dark"] as const) {
    const rgbOf = (token: string) => toRgb(resolveToken(tokens, mode, token));
    const colorOf = (ref: Ref, under: Rgb): Rgb => {
      if (typeof ref === "object") return mix(rgbOf(ref.token), under, ref.alpha);
      return ref.startsWith("#") ? toRgb(ref) : rgbOf(ref);
    };
    for (const pair of pairs) {
      const base = pair.over ? rgbOf(pair.over) : colorOf(pair.bg, [255, 255, 255]);
      let bg = colorOf(pair.bg, base);
      let fg = colorOf(pair.fg, bg);
      if (pair.opacity !== undefined) {
        bg = mix(bg, base, pair.opacity);
        fg = mix(fg, base, pair.opacity);
      }
      const hex = (rgb: Rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
      const ratio = contrastRatio(hex(fg), hex(bg));
      results.push({ mode, pair, ratio, ok: ratio >= pair.min });
    }
  }
  return results;
}

if (import.meta.main) {
  const results = checkPairs(readFileSync("src/app/globals.css", "utf8"), buildPairs());
  let failed = 0;
  for (const { mode, pair, ratio, ok } of results) {
    const status = ok ? "ok  " : pair.knownGap ? "GAP " : "FAIL";
    if (!ok && !pair.knownGap) failed++;
    const gap = !ok && pair.knownGap ? `  (known gap: ${pair.knownGap})` : "";
    console.log(`${status} ${mode.padEnd(5)} ${ratio.toFixed(2).padStart(5)} (min ${pair.min})  ${pair.name}${gap}`);
  }
  console.log(failed === 0 ? "contrast-check: all pairs pass" : `contrast-check: ${failed} pair(s) below minimum`);
  process.exit(failed === 0 ? 0 : 1);
}
