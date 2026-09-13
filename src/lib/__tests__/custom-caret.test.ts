import { describe, expect, it } from "bun:test";
import { APP_INPUT_CLS, SMALL_INPUT_CLS } from "@/components/DateField";

describe("custom text caret", () => {
  it("APP_INPUT_CLS includes the kal-caret class", () => {
    expect(APP_INPUT_CLS.split(/\s+/)).toContain("kal-caret");
  });

  it("SMALL_INPUT_CLS includes the kal-caret class", () => {
    expect(SMALL_INPUT_CLS.split(/\s+/)).toContain("kal-caret");
  });
});
