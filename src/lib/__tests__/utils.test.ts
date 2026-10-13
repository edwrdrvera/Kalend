import { describe, expect, test } from "bun:test";
import { cn } from "../utils";

describe("cn", () => {
  test("keeps a type-scale size when a text color follows it", () => {
    expect(cn("text-meta font-medium", "text-destructive")).toBe("text-meta font-medium text-destructive");
    expect(cn("text-body", "text-muted-foreground")).toBe("text-body text-muted-foreground");
    expect(cn("text-title", "text-foreground")).toBe("text-title text-foreground");
  });

  test("a later type-scale size replaces an earlier one", () => {
    expect(cn("text-xs", "text-meta")).toBe("text-meta");
    expect(cn("text-body", "text-title")).toBe("text-title");
  });
});
