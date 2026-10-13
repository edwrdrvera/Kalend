import { describe, expect, it } from "bun:test";

// Two overlapping checks have to hit a real Postgres. The in-memory mock
// applies updates one at a time, so it cannot show two checks taking the
// same lease. This skips unless the suite is already pointed at that
// database, and it refuses a different DATABASE_URL so it cannot claim
// alerts on a remote database. The check itself runs in a child process.
// Loading it here would bind the suite's mocked database client.
const url = process.env.SCHEMA_TEST_DATABASE_URL;
const sameDatabase = Boolean(url) && url === process.env.DATABASE_URL;

describe.skipIf(!sameDatabase)("overlapping push checks", () => {
  it("sends each alert once", async () => {
    // A path without ./ is a test-name filter, so the file would never run.
    const proc = Bun.spawn({
      cmd: [process.execPath, "test", "./src/db/__tests__/push-due-race.case.ts"],
      env: { ...process.env, DATABASE_URL: url, SCHEMA_TEST_DATABASE_URL: url },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (code !== 0) {
      throw new Error(`overlapping push checks failed (${code})\n${stderr}\n${stdout}`);
    }
  }, 20_000);
});
