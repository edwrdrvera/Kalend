import { describe, expect, it } from "bun:test";

// The database suites skip themselves when their URL is missing, so a CI job
// that lost its database would still pass. This makes CI fail instead.
describe.skipIf(!process.env.CI)("CI database", () => {
  it("gives the database suites a URL", () => {
    expect({
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      SCHEMA_TEST_DATABASE_URL: Boolean(process.env.SCHEMA_TEST_DATABASE_URL),
    }).toEqual({ DATABASE_URL: true, SCHEMA_TEST_DATABASE_URL: true });
  });
});
