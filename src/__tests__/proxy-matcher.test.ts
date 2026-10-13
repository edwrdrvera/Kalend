import { describe, expect, it } from "bun:test";
import { config } from "../proxy";

// Anchored the way Next anchors a matcher. Next's own matcher compiler loads
// request storage that breaks later hook tests in the same bun run.
const runsProxy = (path: string) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path));

describe("proxy matcher", () => {
  it("runs on every API route, including ids that end in an image extension", () => {
    expect(runsProxy("/api/events")).toBe(true);
    expect(runsProxy("/api/events/abc.png")).toBe(true);
    expect(runsProxy("/api/tasks/abc.svg")).toBe(true);
    expect(runsProxy("/api/categories/abc.webp")).toBe(true);
  });

  it("skips the public endpoints and static assets", () => {
    expect(runsProxy("/api/ping")).toBe(false);
    expect(runsProxy("/api/waitlist")).toBe(false);
    expect(runsProxy("/api/dev/sign-in")).toBe(false);
    expect(runsProxy("/logo.png")).toBe(false);
    expect(runsProxy("/icons/check.svg")).toBe(false);
  });

  it("runs on app pages", () => {
    expect(runsProxy("/app")).toBe(true);
    expect(runsProxy("/login")).toBe(true);
  });
});
