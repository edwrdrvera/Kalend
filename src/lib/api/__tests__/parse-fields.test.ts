import { describe, expect, it } from "bun:test";
import { capUnlessUnchanged, date, title, titleUncapped } from "@/lib/api/parse-fields";

describe("date", () => {
  it.each(["2026-08-10T10:00:00.000Z", "2026-08-10T10:00:00Z", "2026-08-10T12:00:00+02:00"])(
    "accepts the ISO timestamp %s",
    (value) => {
      expect(date(value, "start_at")).toEqual({ ok: true, value: new Date(value) });
    }
  );

  it.each([
    "1",
    "2026",
    "2026-08-10",
    "2026-08-10T10:00:00",
    "+275760-09-13T00:00:00Z",
    "-000001-01-01T00:00:00Z",
    "Aug 10 2026",
    "2026-13-01T00:00:00Z",
  ])("rejects %s", (value) => {
    expect(date(value, "start_at")).toEqual({ ok: false, error: "start_at must be a valid date" });
  });
});

describe("title", () => {
  it("accepts 200 characters after trimming", () => {
    expect(title(` ${"a".repeat(200)} `)).toEqual({ ok: true, value: "a".repeat(200) });
  });

  it("rejects more than 200 characters", () => {
    expect(title("a".repeat(201))).toEqual({ ok: false, error: "title must be at most 200 characters" });
  });
});

describe("capUnlessUnchanged", () => {
  const long = "a".repeat(250);

  it("passes a title equal to the stored one after trimming, whatever its length", () => {
    expect(capUnlessUnchanged(title, long, ` ${long} `)).toBeNull();
  });

  it("caps a title that differs from the stored one", () => {
    expect(capUnlessUnchanged(title, "b".repeat(201), long)).toBe("title must be at most 200 characters");
  });

  it("passes when the title is not being changed", () => {
    expect(capUnlessUnchanged(title, undefined, long)).toBeNull();
  });

  it("leaves the uncapped rule to accept any length", () => {
    expect(titleUncapped(long)).toEqual({ ok: true, value: long });
  });
});
