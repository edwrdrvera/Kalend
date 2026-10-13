import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { buildPairs, checkPairs, contrastRatio, parseTokens, resolveToken } from "../contrast-check";

describe("contrastRatio", () => {
  test("old muted text on white is 4.74", () => {
    expect(contrastRatio("#737373", "#ffffff").toFixed(2)).toBe("4.74");
  });

  test("white on the old now red is 3.76", () => {
    expect(contrastRatio("#ffffff", "#ef4444").toFixed(2)).toBe("3.76");
  });

  test("the focus ring orange on white is 3.56", () => {
    expect(contrastRatio("#ea580c", "#ffffff").toFixed(2)).toBe("3.56");
  });

  test("black on white is the 21:1 maximum", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
});

describe("token parsing", () => {
  const css = ":root {\n --a: #111111;\n --b: var(--a);\n}\n.dark {\n --a: #eeeeee;\n}\n";

  test("a dark override wins and a var() reference follows it", () => {
    const tokens = parseTokens(css);
    expect(resolveToken(tokens, "light", "--b")).toBe("#111111");
    expect(resolveToken(tokens, "dark", "--b")).toBe("#eeeeee");
  });
});

describe("globals.css", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const results = checkPairs(css, buildPairs());

  test("every pair meets its minimum in light and dark, except a named known gap", () => {
    const failing = results.filter((r) => !r.ok && !r.pair.knownGap).map((r) => `${r.mode} ${r.pair.name} ${r.ratio.toFixed(2)}`);
    expect(failing).toEqual([]);
  });

  test("the unchecked checkbox border is a checked pair at 3:1, not a known gap", () => {
    const rows = results.filter((r) => r.pair.name === "Unchecked checkbox border on card");
    expect(rows.map((r) => r.mode)).toEqual(["light", "dark"]);
    for (const row of rows) {
      expect(row.pair.knownGap).toBeUndefined();
      expect(row.ok).toBe(true);
    }
  });

  test("the checkbox border fails the check when it falls back to the hairline token", () => {
    const hairline = css.replace("--muted-foreground: #6b6b6b;", "--muted-foreground: #e0e0e0;");
    const failing = checkPairs(hairline, buildPairs()).filter((r) => !r.ok && !r.pair.knownGap);
    expect(failing.some((r) => r.pair.name === "Unchecked checkbox border on card")).toBe(true);
  });

  test("the check fails when a token is made too light", () => {
    const broken = css.replace("--muted-foreground: #6b6b6b;", "--muted-foreground: #a0a0a0;");
    const failing = checkPairs(broken, buildPairs()).filter((r) => !r.ok && !r.pair.knownGap);
    expect(failing.some((r) => r.pair.name.startsWith("muted-foreground on muted"))).toBe(true);
  });
});
