import { describe, expect, it } from "bun:test";
import { bearerMatches } from "@/lib/api/push-auth";

const SECRET = "test-push-secret";

describe("bearerMatches", () => {
  it("accepts the secret and rejects anything else", () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bearerMatches(`Bearer ${SECRET} `, SECRET)).toBe(false);
    expect(bearerMatches("Bearer wrong-secret", SECRET)).toBe(false);
    expect(bearerMatches(SECRET, SECRET)).toBe(false);
    expect(bearerMatches(null, SECRET)).toBe(false);
    expect(bearerMatches("Bearer ", SECRET)).toBe(false);
    expect(bearerMatches(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
  });
});
