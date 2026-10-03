import { describe, expect, it } from "bun:test";
import {
  MAX_DESCRIPTION_LENGTH,
  descriptionProblem,
  isDescriptionDirty,
  normalizeDescription,
} from "../description";

describe("description", () => {
  it("stores trimmed text and turns blank text into null", () => {
    expect(normalizeDescription("  Room 204\n")).toBe("Room 204");
    expect(normalizeDescription(" \n\t ")).toBeNull();
    expect(normalizeDescription("")).toBeNull();
  });

  it("allows the max length and rejects one more, counting after the trim", () => {
    expect(descriptionProblem("x".repeat(MAX_DESCRIPTION_LENGTH))).toBeNull();
    expect(descriptionProblem(`  ${"x".repeat(MAX_DESCRIPTION_LENGTH)}  `)).toBeNull();
    expect(descriptionProblem("x".repeat(MAX_DESCRIPTION_LENGTH + 1))).toContain("too long");
  });

  it("is dirty only when the stored value would change", () => {
    expect(isDescriptionDirty(null, "")).toBe(false);
    expect(isDescriptionDirty(null, "   ")).toBe(false);
    expect(isDescriptionDirty("Bring ID", " Bring ID ")).toBe(false);
    expect(isDescriptionDirty("Bring ID", "")).toBe(true);
    expect(isDescriptionDirty(null, "Bring ID")).toBe(true);
  });
});
