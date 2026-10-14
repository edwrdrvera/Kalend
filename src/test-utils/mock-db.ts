/**
 * Shared mock infrastructure for API route tests. Provides a generic
 * in-memory mock of the Drizzle `db` object and the auth helper, so each
 * test file only needs to define its row type and seed data.
 *
 * The mock stores rows in a plain array and finds the target row by the
 * value the route's condition compares to the `id` column.
 *
 * Crucially, the mock does NOT apply its own user_id filter. Instead it
 * checks whether the route handler's `where` condition compares `user_id`
 * to the authenticated user's ID. If the handler forgot `eq(table.user_id,
 * user.id)`, the mock returns all rows (including other users'), causing
 * test assertions to fail and surfacing the missing filter.
 */
import { mock } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { rowMatcher } from "./where-matcher";

// ── Types ───────────────────────────────────────────────────────────────

interface BaseRow {
  id: string;
  user_id: string;
}

export interface MockDbState<T extends BaseRow> {
  rows: T[];
  shouldFail: boolean;
  shouldFailOnDelete?: boolean;
  transactionCount?: number;
  lockCount?: number;
  /** How many insert statements ran against this table. */
  insertCalls?: number;
  /** Apply the route's real `where` condition to this table's rows (see
   *  where-matcher.ts) instead of the id and user_id heuristics. */
  evaluateWhere?: boolean;
  /** For an insert chained with `onConflictDoNothing()`: true when `incoming`
   *  collides with `existing`, in which case nothing is inserted. */
  conflictsWith?(existing: T, incoming: Record<string, unknown>): boolean;
  /** Runs after a row is deleted from this table, so a test can remove the
   *  rows the database would delete through a foreign key. */
  cascadeOn?(deleted: T): void;
}

export interface MockAuthUser {
  id: string;
  email: string;
}

// ── Condition introspection ─────────────────────────────────────────────

const dialect = new PgDialect();

/**
 * The value the condition compares `column` to with `=`, on whichever table
 * the query reads, or undefined. Reading the SQL Drizzle would send keeps a
 * uuid in another column (a user id, a Space id) from passing as the row id.
 */
function comparedValue(condition: unknown, column: string): unknown {
  if (!condition) return undefined;
  const { sql, params } = dialect.sqlToQuery(condition as SQL);
  const match = new RegExp(`"\\w+"\\."${column}" = \\$(\\d+)`).exec(sql);
  return match ? params[Number(match[1]) - 1] : undefined;
}

// ── Mock setup ──────────────────────────────────────────────────────────

function columnName(column: unknown): string | null {
  if (!column || typeof column !== "object" || !("name" in column)) return null;
  return typeof column.name === "string" ? column.name : null;
}

// NULL never matches in a unique index, including the partial import identity.
function sameIdentity(row: BaseRow, incoming: Record<string, unknown>, names: string[]): boolean {
  return names.every((name) => {
    const left = (row as unknown as Record<string, unknown>)[name];
    const right = incoming[name];
    if (left === null || left === undefined || right === null || right === undefined) return false;
    return left === right;
  });
}

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
 * @param idPrefix  Prefix of the id given to an inserted row, and "category-"
 *                  marks the categories table as the primary one.
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
  getCategoryRows: () => BaseRow[] = () => [],
  relatedStates: Record<string, MockDbState<BaseRow>> = {}
) {
  mock.module("@/lib/supabase/auth-user", () => ({
    getAuthenticatedUser: mock(async () => getUser()),
  }));

  let inserted = 0;
  mock.module("@/db", () => {
    const stateFor = (table: unknown): MockDbState<BaseRow> =>
      relatedStates[tableNameOf(table) ?? ""] ?? (dbState as MockDbState<BaseRow>);

    const fromRows = (table: unknown) => ({
          // The mock does NOT filter by user_id itself. It checks whether
          // the handler's where condition contains the authenticated user's
          // ID. If the handler forgot eq(table.user_id, user.id), the
          // condition won't contain the ID, so the mock returns ALL rows
          // (including other users'), and the test assertion that expects
          // only the current user's data will fail.
          //
          // When the route selects from the "categories" table (for
          // category_id ownership validation), delegate to getCategoryRows.
          where: mock((condition: unknown) => {
            const run = async () => {
            const selectedState = stateFor(table);
            if (selectedState.shouldFail) throw new Error("DB Connection failed");
            const user = getUser();
            if (!user) return [];
            if (selectedState.evaluateWhere) {
              return selectedState.rows.filter(rowMatcher(condition as SQL));
            }
            const scopedByUser = comparedValue(condition, "user_id") === user.id;
            // Only delegate to getCategoryRows for secondary category-
            // ownership lookups. When this mock IS the categories table
            // (idPrefix === "category-"), the primary rows already hold
            // category data, so fall through to the normal path.
            if (tableNameOf(table) === "categories" && idPrefix !== "category-") {
              const catRows = getCategoryRows();
              // The condition carries both a category id and the user id.
              // Filter by both so a nonexistent or foreign-owned category
              // correctly yields an empty result.
              const catId = comparedValue(condition, "id");
              let filtered = scopedByUser
                ? catRows.filter((r) => r.user_id === user.id)
                : catRows;
              if (catId) filtered = filtered.filter((r) => r.id === catId);
              return filtered;
            }
            const targetId = comparedValue(condition, "id");
            const categoryId = comparedValue(condition, "category_id");
            let rows = scopedByUser
              ? selectedState.rows.filter((r) => r.user_id === user.id)
              : selectedState.rows;
            if (targetId) rows = rows.filter((r) => r.id === targetId);
            if (categoryId && (tableNameOf(table) === "events" || tableNameOf(table) === "tasks")) {
              rows = rows.filter((r) => (r as BaseRow & { category_id?: string }).category_id === categoryId);
            }
            return rows;
            };
            const promise = run() as ReturnType<typeof run> & { for: () => ReturnType<typeof run> };
            promise.for = () => {
              // The primary state counts every lock. A related table's state
              // also counts the locks taken on its own table.
              dbState.lockCount = (dbState.lockCount ?? 0) + 1;
              const locked = stateFor(table);
              if (locked !== (dbState as MockDbState<BaseRow>)) {
                locked.lockCount = (locked.lockCount ?? 0) + 1;
              }
              return promise;
            };
            return promise;
          }),
          // A select with no where lists every row. The push check uses it to
          // read owner ids only, then scopes every later query.
          then(onFulfilled: (rows: BaseRow[]) => unknown, onRejected?: (error: unknown) => unknown) {
            const selectedState = stateFor(table);
            if (selectedState.shouldFail) {
              return Promise.reject(new Error("DB Connection failed")).then(onFulfilled, onRejected);
            }
            return Promise.resolve(selectedState.rows).then(onFulfilled, onRejected);
          },
    });
    const queryClient = {
      select: () => ({ from: fromRows }),
      selectDistinct: () => ({ from: fromRows }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
          let skipDuplicates = false;
          let conflictUpdate: Record<string, unknown> | null = null;
          // Columns named by onConflictDoNothing({ target }). A match is skipped.
          // NULL never matches, same as the partial import identity index.
          let nothingTarget: unknown[] = [];
          const builder = {
            onConflictDoNothing: (config?: { target?: unknown }) => {
              skipDuplicates = true;
              nothingTarget = Array.isArray(config?.target) ? config.target : config?.target ? [config.target] : [];
              return builder;
            },
            onConflictDoUpdate: (config: { set?: Record<string, unknown> }) => {
              conflictUpdate = config.set ?? {};
              return builder;
            },
            returning: mock(async () => {
              const insertState = stateFor(table);
              insertState.insertCalls = (insertState.insertCalls ?? 0) + 1;
              if (insertState.shouldFail) throw new Error("DB Insert failed");
              const incomingRows = Array.isArray(vals) ? vals : [vals];
              const results: T[] = [];
              for (const incoming of incomingRows) {
                const payload = filterUndefined
                  ? Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined))
                  : incoming;
                if (skipDuplicates) {
                  const names = nothingTarget.map(columnName).filter((name) => name !== null);
                  const collides = names.length > 0
                    ? (row: BaseRow) => sameIdentity(row, payload, names)
                    : insertState.conflictsWith;
                  if (collides && insertState.rows.some((row) => collides(row, payload))) continue;
                }
                if (conflictUpdate && insertState.conflictsWith) {
                  const index = insertState.rows.findIndex((row) => insertState.conflictsWith!(row, payload));
                  if (index !== -1) {
                    const updated = { ...insertState.rows[index], ...conflictUpdate };
                    insertState.rows[index] = updated;
                    results.push(updated as T);
                    continue;
                  }
                }
                const row = {
                  id: `${idPrefix}uuid-${++inserted}`,
                  created_at: new Date(),
                  ...insertDefaults,
                  ...payload,
                } as T;
                insertState.rows.push(row as unknown as BaseRow);
                results.push(row);
              }
              return results;
            }),
          };
          return builder;
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: (condition: unknown) => ({
            returning: mock(async () => {
              const selectedState = stateFor(table);
              if (selectedState.shouldFail) throw new Error("DB Update failed");
              const matches = selectedState.evaluateWhere ? rowMatcher(condition as SQL) : null;
              const targetId = comparedValue(condition, "id");
              const user = getUser();
              const scopedByUser = user && comparedValue(condition, "user_id") === user.id;
              const categoryId = comparedValue(condition, "category_id");
              const indexes = selectedState.rows
                .map((r, index) => ({ r, index }))
                .filter(({ r }) => matches ? matches(r) :
                  (!targetId || r.id === targetId) &&
                  (!categoryId || (tableNameOf(table) !== "events" && tableNameOf(table) !== "tasks") || (r as BaseRow & { category_id?: string }).category_id === categoryId) &&
                  (!scopedByUser || r.user_id === user!.id)
                )
                .map(({ index }) => index);
              return indexes.map((idx) => {
                const evaluated = Object.fromEntries(Object.entries(vals).map(([key, value]) => [
                  key,
                  typeof value === "function" ? value(selectedState.rows[idx]) : value,
                ]));
                const updated = { ...selectedState.rows[idx], ...evaluated };
                selectedState.rows[idx] = updated;
                return updated;
              });
            }),
          }),
        }),
      }),
      delete: (table: unknown) => ({
        where: (condition: unknown) => ({
          returning: mock(async () => {
            const selectedState = stateFor(table);
            if (selectedState.shouldFail || selectedState.shouldFailOnDelete) throw new Error("DB Delete failed");
            if (selectedState.evaluateWhere) {
              const matches = rowMatcher(condition as SQL);
              const removed = selectedState.rows.filter(matches);
              selectedState.rows = selectedState.rows.filter((r) => !matches(r));
              removed.forEach((row) => selectedState.cascadeOn?.(row));
              return removed;
            }
            const targetId = comparedValue(condition, "id");
            const user = getUser();
            const scopedByUser = user && comparedValue(condition, "user_id") === user.id;
            const idx = selectedState.rows.findIndex(
              (r) => r.id === targetId && (!scopedByUser || r.user_id === user!.id)
            );
            if (idx === -1) return [];
            const [deleted] = selectedState.rows.splice(idx, 1);
            selectedState.cascadeOn?.(deleted);
            return [deleted];
          }),
        }),
      }),
    };
    const database = {
      ...queryClient,
      transaction: async <R>(callback: (tx: typeof queryClient) => Promise<R>) => {
        dbState.transactionCount = (dbState.transactionCount ?? 0) + 1;
        const states = [dbState as MockDbState<BaseRow>, ...Object.values(relatedStates)];
        const snapshots = states.map((state) => state.rows.map((row) => ({ ...row })));
        try {
          return await callback(queryClient);
        } catch (error) {
          states.forEach((state, index) => { state.rows = snapshots[index]; });
          throw error;
        }
      },
    };
    return { db: database };
  });
}
