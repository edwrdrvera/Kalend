import { describe, expect, test } from "bun:test";
import { formatRow, parseAddArgs, parseLog, type Row, stats } from "../review-log";

const row = (overrides: Partial<Row>): Row => ({
  pr: "1",
  date: "2026-09-27",
  tier: "high",
  reviewerVersion: "aaa1111",
  finding: "f",
  severity: "high",
  outcome: "real-fixed",
  ...overrides,
});

describe("formatRow", () => {
  test("a finding with tabs or newlines stays on one row", () => {
    const line = formatRow(row({ finding: "two\tcolumns\nand a line" }));
    expect(line.split("\t")).toHaveLength(7);
    expect(line).toContain("two columns and a line");
  });

  test("round-trips through parseLog", () => {
    const original = row({ finding: "route reachable without auth", outcome: "false-positive" });
    expect(parseLog(`header\n${formatRow(original)}\n`)).toEqual([original]);
  });
});

describe("stats", () => {
  test("groups by reviewer version and keeps misses out of the finding count", () => {
    const result = stats([
      row({ pr: "1", outcome: "real-fixed" }),
      row({ pr: "1", outcome: "false-positive" }),
      row({ pr: "2", outcome: "missed" }),
      row({ pr: "3", reviewerVersion: "bbb2222", outcome: "ignored" }),
    ]);
    expect(result).toEqual([
      { version: "aaa1111", prs: 2, findings: 2, real: 1, falsePositives: 1, missed: 1 },
      { version: "bbb2222", prs: 1, findings: 1, real: 0, falsePositives: 0, missed: 0 },
    ]);
  });
});

describe("parseAddArgs", () => {
  test("joins the finding words", () => {
    expect(parseAddArgs(["204", "high", "real-fixed", "missing", "auth", "check"])).toEqual({
      pr: "204",
      severity: "high",
      outcome: "real-fixed",
      finding: "missing auth check",
    });
  });

  test("refuses an unknown outcome or severity", () => {
    expect(() => parseAddArgs(["204", "high", "maybe", "x"])).toThrow('Unknown outcome "maybe"');
    expect(() => parseAddArgs(["204", "urgent", "ignored", "x"])).toThrow('Unknown severity "urgent"');
  });

  test("refuses a missing finding", () => {
    expect(() => parseAddArgs(["204", "high", "ignored"])).toThrow("Usage");
  });
});
