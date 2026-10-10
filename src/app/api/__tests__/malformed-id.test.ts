import { describe, expect, it, mock } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Postgres answers a non-uuid compared against a uuid column with an error, so
// a malformed id must be turned away before any query runs. This recorder logs
// every query instead of answering it.
const dialect = new PgDialect();
const queries: string[] = [];
type Rows = Promise<never[]> & { for: () => Rows; returning: () => Rows };
const recorded = (kind: string) => ({
  where: (condition: SQL) => {
    queries.push(`${kind} ${dialect.sqlToQuery(condition).sql}`);
    const rows = Promise.resolve([]) as Rows;
    rows.for = () => rows;
    rows.returning = () => rows;
    return rows;
  },
});
const client = {
  select: () => ({ from: () => recorded("select") }),
  update: () => ({ set: () => recorded("update") }),
  delete: () => recorded("delete"),
  transaction: <T>(callback: (tx: unknown) => Promise<T>) => callback(client),
};
mock.module("@/db", () => ({ db: client }));
mock.module("@/lib/supabase/auth-user", () => ({
  getAuthenticatedUser: async () => ({ id: "11111111-1111-4111-8111-000000000001", email: "a@b.c" }),
}));

const routes = [
  { name: "events", notFound: "Event not found", patch: { title: "x" }, mod: await import("../events/[id]/route") },
  { name: "tasks", notFound: "Task not found", patch: { title: "x" }, mod: await import("../tasks/[id]/route") },
  { name: "categories", notFound: "Space not found", patch: { name: "x" }, mod: await import("../categories/[id]/route") },
];
const context = { params: Promise.resolve({ id: "foo" }) };

describe("a malformed id on an [id] route", () => {
  for (const { name, notFound, patch, mod } of routes) {
    it(`DELETE /api/${name}/foo returns 404 without querying`, async () => {
      queries.length = 0;
      const res = await mod.DELETE(new Request(`http://localhost/api/${name}/foo`, { method: "DELETE" }), context);
      expect({ status: res.status, body: await res.json(), queries }).toEqual({
        status: 404,
        body: { success: false, error: notFound },
        queries: [],
      });
    });

    it(`PATCH /api/${name}/foo returns 404 without querying`, async () => {
      queries.length = 0;
      const res = await mod.PATCH(
        new Request(`http://localhost/api/${name}/foo`, { method: "PATCH", body: JSON.stringify(patch) }),
        context
      );
      expect({ status: res.status, body: await res.json(), queries }).toEqual({
        status: 404,
        body: { success: false, error: notFound },
        queries: [],
      });
    });
  }
});
