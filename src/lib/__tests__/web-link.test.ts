import { describe, expect, test } from "bun:test";
import { parseWebLink } from "../web-link";

describe("parseWebLink", () => {
  test("adds https when there is no scheme and strips www from the host", () => {
    expect(parseWebLink("www.canvas.edu/courses/1")).toEqual({
      href: "https://www.canvas.edu/courses/1",
      host: "canvas.edu",
    });
  });

  test("keeps an http link as typed", () => {
    expect(parseWebLink("http://example.com")?.href).toBe("http://example.com/");
  });

  test.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "JaVaScRiPt://x.y"])(
    "rejects %s",
    (input) => {
      expect(parseWebLink(input)).toBeNull();
    }
  );

  test.each(["", "   ", "localhost", "not a link", "https://"])("rejects %p", (input) => {
    expect(parseWebLink(input)).toBeNull();
  });
});
