import { describe, it } from "bun:test";
import { RuleTester, type Rule } from "eslint";
import plugin from "../scoped-query.mjs";

// Let RuleTester register its cases through bun:test.
RuleTester.describe = describe;
RuleTester.it = it;

// The rule is authored as untyped .mjs (it is loaded by ESLint, not compiled),
// so narrow it to the RuleModule shape for the tester.
const rule = plugin.rules["scoped-query"] as unknown as Rule.RuleModule;
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

ruleTester.run("scoped-query", rule, {
  valid: [
    // Owner filter written inline, directly and nested in and().
    "db.select().from(events).where(and(eq(events.id, id), eq(events.user_id, user.id)))",
    // The tx builder inside a transaction, with .for('update') chained after.
    "db.transaction(async (tx) => tx.select().from(events).where(and(eq(events.id, id), eq(events.user_id, user.id))).for('update'))",
    "db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.user_id, user.id)))",
    "db.update(categories).set({ name }).where(and(eq(categories.id, id), eq(categories.user_id, user.id)))",
    // A table outside the scoped set is ignored entirely.
    "db.select().from(waitlist).where(eq(waitlist.email, email))",
    // Dynamic extra conditions spread next to the owner filter.
    "db.select().from(tasks).where(and(eq(tasks.user_id, user.id), ...conds))",
    // Array.from over a variable that happens to share a table name is not a query.
    "Array.from(tasks)",
    // Inserts carry user_id in their values, not a where.
    "db.insert(tasks).values({ title, user_id: user.id })",
  ],
  invalid: [
    // A select with no where at all.
    { code: "db.select().from(tasks)", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // An update with no where rewrites every user's rows.
    { code: "db.update(tasks).set({ completed: true })", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A delete with no where.
    { code: "db.delete(events)", errors: [{ message: /Query over "events" is missing an eq\(events\.user_id/ }] },
    // An empty where.
    { code: "db.select().from(tasks).where()", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // or() lets other users' rows through.
    { code: "db.select().from(tasks).where(or(eq(tasks.user_id, user.id), eq(tasks.id, id)))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // not() selects everyone else's rows.
    { code: "db.select().from(tasks).where(not(eq(tasks.user_id, user.id)))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    { code: "db.query.tasks.findMany()", errors: [{ message: /db\.query\.tasks hides its filter/ }] },
    { code: "db.execute(sql`select * from tasks`)", errors: [{ message: /Raw SQL cannot be checked/ }] },
    {
      code: "db.select().from(events).where(eq(events.id, id))",
      errors: [{ message: /Query over "events" is missing an eq\(events\.user_id/ }],
    },
    {
      code: "db.transaction(async (tx) => tx.update(events).set({ title }).where(eq(events.id, id)))",
      errors: [{ message: /Query over "events" is missing an eq\(events\.user_id/ }],
    },
    {
      code: "db.delete(categories).where(eq(categories.id, id))",
      errors: [{ message: /Query over "categories" is missing an eq\(categories\.user_id/ }],
    },
    {
      code: "db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.completed, false)))",
      errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }],
    },
  ],
});
