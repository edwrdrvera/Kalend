/**
 * Shared mock infrastructure for API route tests. Provides a generic
 * in-memory mock of the Drizzle `db` object and the auth helper, so each
 * test file only needs to define its row type and seed data.
 *
 * The mock stores rows in a plain array and matches IDs via a BFS walk
 * of Drizzle's condition tree (the opaque object `eq()` / `and()` produce).
 * ID strings are matched by a caller-supplied prefix (e.g. "evt-", "task-")
 * or the substring "existent" (used for not-found test cases).
 *
 * Crucially, the mock does NOT apply its own user_id filter. Instead it
 * checks whether the route handler's `where` condition actually contains
 * the authenticated user's ID. If the handler forgot `eq(table.user_id,
 * user.id)`, the mock returns all rows (including other users'), causing
 * test assertions to fail and surfacing the missing filter.
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

// ── Condition introspection ─────────────────────────────────────────────

/** BFS walk that collects every string value from a Drizzle condition tree. */
function collectStrings(condition: unknown): Set<string> {
  const strings = new Set<string>();
  if (!condition) return strings;
  if (typeof condition === "string") {
    strings.add(condition);
    return strings;
  }

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
        strings.add(val);
      } else if (val && typeof val === "object") {
        queue.push(val);
      }
    }
  }
  return strings;
}

/**
 * Returns the first string in the condition matching `idPrefix` or
 * containing "existent". This is how the mock resolves which row a
 * PATCH/DELETE targets.
 */
export function extractIdFromCondition(
  condition: unknown,
  idPrefix: string
): string | null {
  for (const s of collectStrings(condition)) {
    if (s.startsWith(idPrefix) || s.includes("existent")) return s;
  }
  return null;
}

/** True if `value` appears somewhere in the condition tree. */
function conditionContains(condition: unknown, value: string): boolean {
  return collectStrings(condition).has(value);
}

// ── Mock setup ──────────────────────────────────────────────────────────

/** Drizzle table objects expose their name via `Symbol(drizzle:Name)`. */
function tableNameOf(table: unknown): string | null {
  if (!table || typeof table !== "object") return null;
  const record = table as Record<symbol, unknown>;
  for (const sym of Object.getOwnPropertySymbols(record)) {
    if (sym.description === "drizzle:Name" && typeof record[sym] === "string") {
      return record[sym] as string;
    }
  }
  return null;
}

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
 * @param getCategoryRows Optional getter for a mutable list of category rows
 *                        used to validate `category_id` ownership in event
 *                        and task route handlers. When a route selects from
 *                        the "categories" table, the mock returns these rows
 *                        filtered by `user_id` the same way the primary rows
 *                        are filtered. Omit (or pass `() => []`) when the
 *                        test file does not exercise category validation.
 */
export function setupMockDb<T extends BaseRow>(
  idPrefix: string,
  dbState: MockDbState<T>,
  getUser: () => MockAuthUser | null,
  insertDefaults: Partial<T> = {},
  filterUndefined = false,
  getCategoryRows: () => BaseRow[] = () => []
) {
  mock.module("@/lib/supabase/auth-user", () => ({
    getAuthenticatedUser: mock(async () => getUser()),
  }));

  mock.module("@/db", () => ({
    db: {
      select: () => ({
        from: (table: unknown) => ({
          // The mock does NOT filter by user_id itself. It checks whether
          // the handler's where condition contains the authenticated user's
          // ID. If the handler forgot eq(table.user_id, user.id), the
          // condition won't contain the ID, so the mock returns ALL rows
          // (including other users'), and the test assertion that expects
          // only the current user's data will fail.
          //
          // When the route selects from the "categories" table (for
          // category_id ownership validation), delegate to getCategoryRows.
          where: mock(async (condition: unknown) => {
            if (dbState.shouldFail) throw new Error("DB Connection failed");
            const user = getUser();
            if (!user) return [];
            const scopedByUser = conditionContains(condition, user.id);
            // Only delegate to getCategoryRows for secondary category-
            // ownership lookups. When this mock IS the categories table
            // (idPrefix === "category-"), the primary rows already hold
            // category data, so fall through to the normal path.
            if (tableNameOf(table) === "categories" && idPrefix !== "category-") {
              const catRows = getCategoryRows();
              // The condition carries both a category id and the user id.
              // Filter by both so a nonexistent or foreign-owned category
              // correctly yields an empty result.
              const catId = extractIdFromCondition(condition, "category-");
              let filtered = scopedByUser
                ? catRows.filter((r) => r.user_id === user.id)
                : catRows;
              if (catId) filtered = filtered.filter((r) => r.id === catId);
              return filtered;
            }
            return scopedByUser
              ? dbState.rows.filter((r) => r.user_id === user.id)
              : dbState.rows;
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
              const scopedByUser = user && conditionContains(condition, user.id);
              const idx = dbState.rows.findIndex(
                (r) => r.id === targetId && (!scopedByUser || r.user_id === user!.id)
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
            const scopedByUser = user && conditionContains(condition, user.id);
            const idx = dbState.rows.findIndex(
              (r) => r.id === targetId && (!scopedByUser || r.user_id === user!.id)
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
