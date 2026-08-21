import { describe, expect, it } from "bun:test";
import {
  EVENT_COLORS,
  isEventColor,
  getEventColorClasses,
  getTaskColorClasses,
  resolveDisplayColor,
  EVENT_COLOR_CLASSES,
  DEFAULT_EVENT_COLOR_CLASSES,
  TASK_COLOR_CLASSES,
  DEFAULT_TASK_COLOR_CLASSES,
} from "../event-colors";

describe("isEventColor", () => {
  it.each(EVENT_COLORS.map((c) => [c]))("returns true for valid color %s", (color) => {
    expect(isEventColor(color)).toBe(true);
  });

  it("returns false for an invalid string", () => {
    expect(isEventColor("chartreuse")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isEventColor(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isEventColor(undefined)).toBe(false);
  });
});

describe("getEventColorClasses", () => {
  it("returns the matching class string for a valid color", () => {
    expect(getEventColorClasses("blue")).toBe(EVENT_COLOR_CLASSES.blue);
    expect(getEventColorClasses("teal")).toBe(EVENT_COLOR_CLASSES.teal);
  });

  it("returns default neutral classes for an invalid color", () => {
    expect(getEventColorClasses("chartreuse")).toBe(DEFAULT_EVENT_COLOR_CLASSES);
  });

  it("returns default neutral classes for null", () => {
    expect(getEventColorClasses(null)).toBe(DEFAULT_EVENT_COLOR_CLASSES);
  });
});

describe("getTaskColorClasses", () => {
  it("returns the matching class string for a valid color", () => {
    expect(getTaskColorClasses("green")).toBe(TASK_COLOR_CLASSES.green);
    expect(getTaskColorClasses("red")).toBe(TASK_COLOR_CLASSES.red);
  });

  it("returns default neutral classes for an invalid color", () => {
    expect(getTaskColorClasses("chartreuse")).toBe(DEFAULT_TASK_COLOR_CLASSES);
  });

  it("returns default neutral classes for null", () => {
    expect(getTaskColorClasses(null)).toBe(DEFAULT_TASK_COLOR_CLASSES);
  });
});

describe("resolveDisplayColor", () => {
  const categories = [
    { id: "cat-1", color: "purple" },
    { id: "cat-2", color: null },
  ] as const;

  it("returns own color when there is no category", () => {
    expect(resolveDisplayColor("blue", null, categories)).toBe("blue");
  });

  it("returns the category color when linked to a matching category", () => {
    expect(resolveDisplayColor("blue", "cat-1", categories)).toBe("purple");
  });

  it("falls back to own color when category_id points to a nonexistent category", () => {
    expect(resolveDisplayColor("green", "cat-deleted", categories)).toBe("green");
  });

  it("returns null when own color is null and there is no category", () => {
    expect(resolveDisplayColor(null, null, categories)).toBe(null);
  });
});
