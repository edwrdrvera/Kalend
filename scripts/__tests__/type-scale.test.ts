import { describe, expect, test } from "bun:test";
import { rewriteSource } from "../codemods/type-scale";

const APP = "src/components/Example.tsx";
const TIME_GRID = "src/components/TimeGrid.tsx";
const LANDING = "src/components/landing/CalendarMockup.tsx";

const run = (classes: string, file = APP) => rewriteSource(`"${classes}"`, file).source;

describe("type-scale codemod, mapping rows", () => {
  test("13px and 12.5px become text-body", () => {
    expect(run("text-[13px] font-medium")).toBe(`"text-body font-medium"`);
    expect(run("text-[12.5px]")).toBe(`"text-body"`);
  });

  test("12px and 11.5px become text-xs and gain leading-normal", () => {
    expect(run("text-[12px]")).toBe(`"text-xs leading-normal"`);
    expect(run("text-[11.5px] text-muted-foreground")).toBe(`"text-xs leading-normal text-muted-foreground"`);
  });

  test("14px and 15px become text-sm and gain leading-normal", () => {
    expect(run("text-[14px]")).toBe(`"text-sm leading-normal"`);
    expect(run("text-[15px]")).toBe(`"text-sm leading-normal"`);
  });

  test("11px becomes text-meta with no companion", () => {
    expect(run("text-[11px] font-semibold")).toBe(`"text-meta font-semibold"`);
  });

  test("17px and 20px become text-title", () => {
    expect(run("text-[17px] font-semibold")).toBe(`"text-title font-semibold"`);
    expect(run("text-[20px]")).toBe(`"text-title"`);
  });

  test("9px and 10px become text-meta outside the two allowlisted files", () => {
    expect(run("text-[10px] font-bold")).toBe(`"text-meta font-bold"`);
    expect(run("text-[9px]")).toBe(`"text-meta"`);
  });

  test("sizes off the scale are left alone", () => {
    expect(run("text-[7px] text-[8px]")).toBe(`"text-[7px] text-[8px]"`);
  });
});

describe("type-scale codemod, line-height and variants", () => {
  test("a companioned size keeps an existing leading class and gains none", () => {
    expect(run("text-[12px] leading-none")).toBe(`"text-xs leading-none"`);
  });

  test("a variant gets its own leading class", () => {
    expect(run("text-[11px] sm:text-[12px]")).toBe(`"text-meta sm:text-xs sm:leading-normal"`);
  });

  test("a variant keeps the variant on the replacement", () => {
    expect(run("min-[520px]:text-[11px]")).toBe(`"min-[520px]:text-meta"`);
  });
});

describe("type-scale codemod, scope", () => {
  test("keeps 9px and 10px in the hour gutter and mini calendar", () => {
    expect(run("text-[10px] sm:text-[9px] text-[11px]", TIME_GRID)).toBe(`"text-[10px] sm:text-[9px] text-meta"`);
  });

  test("leaves the landing page alone", () => {
    const source = `"text-[8px] text-[13px] min-[520px]:text-[10px]"`;
    expect(rewriteSource(source, LANDING)).toEqual({ source, count: 0 });
  });

  test("is idempotent", () => {
    const once = run("text-[12px] text-[11px] text-[14px]");
    expect(run(once.slice(1, -1))).toBe(once);
  });
});
