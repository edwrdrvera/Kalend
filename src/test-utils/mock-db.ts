/**
 * Shared mock infrastructure for API route tests. Provides a generic
 * in-memory mock of the Drizzle `db` object and the auth helper, so each
 * test file only needs to define its row type and seed data.
 *
 * The mock stores rows in a plain array and matches IDs via a BFS walk
 * of Drizzle's condition tree (the opaque object `eq()` / `and()` produce).
 * ID strings are matched by a caller-supplied prefix (e.g. "evt-", "task-")
 * or the substring "existent" (used for not-found test cases).
 */
import { mock } from "bun:test";

// ── Types ───────────────────────────────────────────────────────────────

interface BaseRow {
  id: string;
  user_id: string;
}

export interface MockDbState<T extends BaseRow> {
  rows: T[];
  shouldFail: boolean;
}

export interface MockAuthUser {
  id: string;
  email: string;
}

// ── ID extraction ───────────────────────────────────────────────────────

/**
 * Walks the opaque condition object Drizzle's `eq()` / `and()` produce and
 * returns the first string value matching `idPrefix` or containing
 * "existent". This is how the mock resolves which row a PATCH/DELETE
 * targets.
 */
export function extractIdFromCondition(
  condition: unknown,
  idPrefix: string
): string | null {
  if (!condition) return null;
  if (typeof condition === "string") return condition;

  const seen = new Set<unknown>();
  const queue: unknown[] = [condition];
  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr || typeof curr !== "object" || seen.has(curr)) continue;
    seen.add(curr);

    const record = curr as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === "string") {
        if (val.startsWith(idPrefix) || val.includes("existent")) return val;
      } else if (val && typeof val === "object") {
        queue.push(val);
      }
    }
  }

  return null;
}

// ── Mock setup ──────────────────────────────────────────────────────────

/**
 * Registers `mock.module` for `@/db` and `@/lib/supabase/auth-user`,
 * wiring both to the provided mutable state objects. Call this at the top
 * of each test file, before importing route handlers.
 *
 * @param idPrefix  The string prefix used to identify row IDs in
 *                  condition objects (e.g. "evt-", "task-", "category-").
 * @param dbState   Mutable state holding the in-memory row array and the
 *                  `shouldFail` flag for simulating DB errors.
 * @param getUser   A function returning the current mock user (or null for
 *                  unauthenticated tests).
 * @param insertDefaults  Default values spread under the inserted row
 *                        (e.g. `{ completed: false, due_at: null }` for
 *                        tasks, `{ color: "blue" }` for categories).
 * @param filterUndefined If true, strip `undefined` values from the
 *                        insert payload before merging defaults (mirrors
 *                        Drizzle/postgres-js behavior for column defaults).
 */
export function setupMockDb<T extends BaseRow>(
  idPrefix: string,
  dbState: MockDbState<T>,
  getUser: () => MockAuthUser | null,
  insertDefaults: Partial<T> = {},
  filterUndefined = false
) {
  mock.module("@/lib/supabase/auth-user", () => ({
    getAuthenticatedUser: mock(async () => getUser()),
  }));

  mock.module("@/db", () => ({
    db: {
      select: () => ({
        from: () => ({
          where: mock(async () => {
            if (dbState.shouldFail) throw new Error("DB Connection failed");
            const user = getUser();
            if (!user) return [];
            return dbState.rows.filter((r) => r.user_id === user.id);
          }),
        }),
      }),
      insert: () => ({
        values: (vals: Record<string, unknown>) => ({
          returning: mock(async () => {
            if (dbState.shouldFail) throw new Error("DB Insert failed");
            const payload = filterUndefined
              ? Object.fromEntries(
                  Object.entries(vals).filter(([, v]) => v !== undefined)
                )
              : vals;
            const row = {
              id: `${idPrefix}uuid-1`,
              created_at: new Date(),
              ...insertDefaults,
              ...payload,
            } as T;
            dbState.rows.push(row);
            return [row];
          }),
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: (condition: unknown) => ({
            returning: mock(async () => {
              if (dbState.shouldFail) throw new Error("DB Update failed");
              const targetId = extractIdFromCondition(condition, idPrefix);
              const user = getUser();
              const idx = dbState.rows.findIndex(
                (r) => r.id === targetId && (!user || r.user_id === user.id)
              );
              if (idx === -1) return [];
              const updated = { ...dbState.rows[idx], ...vals };
              dbState.rows[idx] = updated;
              return [updated];
            }),
          }),
        }),
      }),
      delete: () => ({
        where: (condition: unknown) => ({
          returning: mock(async () => {
            if (dbState.shouldFail) throw new Error("DB Delete failed");
            const targetId = extractIdFromCondition(condition, idPrefix);
            const user = getUser();
            const idx = dbState.rows.findIndex(
              (r) => r.id === targetId && (!user || r.user_id === user.id)
            );
            if (idx === -1) return [];
            const [deleted] = dbState.rows.splice(idx, 1);
            return [deleted];
          }),
        }),
      }),
    },
  }));
}
