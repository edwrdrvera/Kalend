import { describe, expect, test } from "bun:test";
import { rewriteSource } from "../codemods/focus-ring";

describe("focus-ring codemod", () => {
  test("swaps the three-class ring for focus-ring and drops the outline reset", () => {
    const before = `<button className="rounded-md hover:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60" />`;
    expect(rewriteSource(before)).toBe(`<button className="rounded-md hover:bg-hover focus-ring" />`);
  });

  test("drops a bare outline-none in the same string and keeps classes that follow", () => {
    const before = `cn("a outline-none focus-visible:ring-1 focus-visible:ring-ring/60", x && "b")`;
    expect(rewriteSource(before)).toBe(`cn("a focus-ring", x && "b")`);
  });

  test("leaves strings without the old ring alone, and is idempotent", () => {
    const untouched = `"outline-none focus-visible:ring-1"`;
    expect(rewriteSource(untouched)).toBe(untouched);
    const once = rewriteSource(`"x focus-visible:ring-1 focus-visible:ring-ring/60"`);
    expect(rewriteSource(once)).toBe(once);
  });
});
