import { describe, expect, it } from "bun:test";
import { resolveInitialTheme } from "../theme";

describe("resolveInitialTheme", () => {
  it("returns 'dark' when stored value is 'dark'", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("dark", true)).toBe("dark");
  });

  it("returns 'light' when stored value is 'light'", () => {
    expect(resolveInitialTheme("light", false)).toBe("light");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  it("falls back to OS preference when no stored value", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("ignores an unrecognised stored value and uses OS preference", () => {
    expect(resolveInitialTheme("invalid", true)).toBe("dark");
    expect(resolveInitialTheme("invalid", false)).toBe("light");
  });
});
