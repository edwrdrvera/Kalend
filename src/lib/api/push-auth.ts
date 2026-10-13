import { timingSafeEqual } from "node:crypto";

/** True when the header is `Bearer <secret>`. Length mismatches still take a compare. */
export function bearerMatches(authorization: string | null, secret: string): boolean {
  const prefix = "Bearer ";
  const token = authorization?.startsWith(prefix) ? authorization.slice(prefix.length) : "";
  const provided = Buffer.from(token);
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(provided, expected);
}
