import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..", "..");
const localDir = join(repoRoot, "src/components/ui");
const libraryDir = process.env.KALEND_UI_DIR ?? join(repoRoot, "..", "kalend-ui", "src/components/ui");

describe("ui primitives match kalend-ui byte for byte", () => {
  if (!existsSync(libraryDir)) {
    test.skip(`skipped: kalend-ui not found at ${libraryDir}`, () => {});
    return;
  }

  for (const file of readdirSync(localDir)) {
    const libraryFile = join(libraryDir, file);
    if (!existsSync(libraryFile)) continue;

    test(`${file} equals the library copy`, () => {
      expect(readFileSync(join(localDir, file), "utf8")).toBe(readFileSync(libraryFile, "utf8"));
    });
  }
});
