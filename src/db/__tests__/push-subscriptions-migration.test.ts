import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import journal from "../../../drizzle/meta/_journal.json";

const sql = readFileSync(new URL("../../../drizzle/0017_push_subscriptions.sql", import.meta.url), "utf8");
const down = readFileSync(new URL("../../../drizzle/rollback/0017_push_subscriptions.down.sql", import.meta.url), "utf8");

describe("push subscription migration", () => {
  it("is the next migration after the ones already on develop", () => {
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags.at(-1)).toBe("0017_push_subscriptions");
    expect(tags).toContain("0015_rls_app_role");
    expect(tags).toContain("0016_kalend_app_role");
    expect(new Set(tags).size).toBe(tags.length);
    expect(journal.entries.map((entry) => entry.idx)).toEqual(journal.entries.map((_, index) => index));
  });

  it("stores one row per device endpoint and locks the table down", () => {
    expect(sql).toContain('CREATE TABLE "push_subscriptions"');
    expect(sql).toContain('UNIQUE("endpoint")');
    expect(sql).toContain('"user_id" uuid NOT NULL');
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON TABLE "push_subscriptions" FROM anon, authenticated');
    expect(sql).toContain("create policy push_subscriptions_owner on push_subscriptions");
    expect(sql).toContain("user_id = public.app_user_id()");
    expect(sql).toContain("grant select, insert, update, delete on push_subscriptions to kalend_app");
    expect(sql).not.toContain("auth.uid()");
  });

  it("rolls back by dropping only that table", () => {
    expect(down).toContain('DROP TABLE "push_subscriptions"');
    expect(down).not.toContain("DROP TABLE \"events\"");
    expect(down).not.toContain("DROP TABLE \"alerts\"");
  });
});
