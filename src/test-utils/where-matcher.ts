import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

/**
 * Turns the condition a route passes to `.where(...)` into a row predicate, so
 * a mock table can apply it for real. It reads the SQL Drizzle would send and
 * supports what the alert routes use: `and` of `=`, `<`, `<=`, `>`, `>=`,
 * `in (...)`, `is null` and `is not null` on one table's columns. Anything
 * else throws, so a test never passes on a condition the mock ignored.
 */
const dialect = new PgDialect();
const CLAUSE = /^"\w+"\."(\w+)" (=|<=|>=|<|>|in|is null|is not null)\s*(.*)$/;

type Row = object;

const comparable = (value: unknown): unknown =>
  value instanceof Date ? value.getTime() : value;

// Timestamp params are sent to the driver as ISO strings, while rows hold Dates.
function normalize(rowValue: unknown, param: unknown): [unknown, unknown] {
  if (rowValue instanceof Date) return [rowValue.getTime(), new Date(String(param)).getTime()];
  return [comparable(rowValue), param];
}

export function rowMatcher(condition: SQL | undefined): (row: Row) => boolean {
  if (!condition) return () => true;
  const { sql, params } = dialect.sqlToQuery(condition);
  if (/ or | not /.test(sql)) throw new Error(`where-matcher does not support: ${sql}`);
  const flat = sql
    .replace(/ in \(([^)]*)\)/g, " in $1")
    .replace(/[()]/g, "");
  const tests = flat.split(" and ").map((clause) => {
    const match = CLAUSE.exec(clause.trim());
    if (!match) throw new Error(`where-matcher does not support clause: ${clause}`);
    const [, column, operator, rest] = match;
    const values = [...rest.matchAll(/\$(\d+)/g)].map((m) => params[Number(m[1]) - 1]);
    return (row: Row): boolean => {
      const rowValue = (row as Record<string, unknown>)[column];
      if (operator === "is null") return rowValue === null || rowValue === undefined;
      if (operator === "is not null") return rowValue !== null && rowValue !== undefined;
      if (operator === "in") return values.some((v) => normalize(rowValue, v)[0] === normalize(rowValue, v)[1]);
      if (rowValue === null || rowValue === undefined) return false;
      const [left, right] = normalize(rowValue, values[0]);
      if (operator === "=") return left === right;
      if (typeof left !== "number" || typeof right !== "number") return false;
      if (operator === "<=") return left <= right;
      if (operator === ">=") return left >= right;
      return operator === "<" ? left < right : left > right;
    };
  });
  return (row) => tests.every((test) => test(row));
}
