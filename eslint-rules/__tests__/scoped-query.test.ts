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
    // Inserts carry the signed-in user's id in their values, not a where.
    "db.insert(tasks).values({ title, user_id: user.id })",
    "db.insert(events).values({ title, user_id: user.id }).returning()",
    // A spread before user_id can't override it.
    "db.insert(tasks).values({ ...(due ? { due_at: due } : {}), user_id: user.id })",
    "db.insert(categories).values([{ name: a, user_id: user.id }, { name: b, user_id: user.id }])",
    // An upsert may leave the owner alone or keep it as the signed-in user.
    "db.insert(tasks).values({ title, user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { title } })",
    "db.insert(tasks).values({ title, user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { title, user_id: user.id } })",
    // A table outside the scoped set can insert anything.
    "db.insert(waitlist).values({ email })",
    // An aliased import is still checked, and passes when scoped.
    "import { tasks as t } from '@/db/schema/tasks'; db.select().from(t).where(eq(t.user_id, user.id))",
  ],
  invalid: [
    // A table reached through the schema namespace.
    { code: "import * as schema from '@/db/schema'; db.select().from(schema.tasks)", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A renamed table import.
    { code: "import { tasks as tasksTable } from '@/db/schema/tasks'; db.select().from(tasksTable)", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A local alias of the table.
    { code: "const t = tasks; db.update(t).set({ completed: true })", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A drizzle alias() of the table.
    { code: "db.select().from(alias(tasks, 't'))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // The owner id taken from the request body.
    { code: "db.select().from(tasks).where(eq(tasks.user_id, body.user_id))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A column compared with itself matches every row.
    { code: "db.delete(tasks).where(eq(tasks.user_id, tasks.user_id))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A select with no where at all.
    { code: "db.select().from(tasks)", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // An update with no where rewrites every user's rows.
    { code: "db.update(tasks).set({ completed: true })", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A write whose builder comes from a call or an await is still a query.
    { code: "tx().delete(tasks).where(eq(tasks.id, body.id))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    { code: "async () => (await getDb()).update(tasks).set({ title }).where(eq(tasks.id, body.id))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // A delete with no where.
    { code: "db.delete(events)", errors: [{ message: /Query over "events" is missing an eq\(events\.user_id/ }] },
    // An empty where.
    { code: "db.select().from(tasks).where()", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // or() lets other users' rows through.
    { code: "db.select().from(tasks).where(or(eq(tasks.user_id, user.id), eq(tasks.id, id)))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // not() selects everyone else's rows.
    { code: "db.select().from(tasks).where(not(eq(tasks.user_id, user.id)))", errors: [{ message: /Query over "tasks" is missing an eq\(tasks\.user_id/ }] },
    // An insert with no user_id, or one taken from somewhere other than the signed-in user.
    { code: "db.insert(tasks).values({ title })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "db.insert(tasks).values({ title, user_id: body.user_id })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "db.insert(events).values(body)", errors: [{ message: /Insert into "events" must set user_id: user\.id/ }] },
    { code: "db.insert(events).values({ ...body })", errors: [{ message: /Insert into "events" must set user_id: user\.id/ }] },
    // A spread after user_id can overwrite it.
    { code: "db.insert(tasks).values({ user_id: user.id, ...body })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    // A computed key after user_id can resolve to "user_id" at runtime and overwrite it.
    { code: "db.insert(tasks).values({ user_id: user.id, [`user_id`]: body.uid })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "db.insert(tasks).values({ user_id: user.id, ['user' + '_id']: body.uid })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    // An upsert whose conflict update can move the row to another owner.
    { code: "db.insert(tasks).values({ user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { user_id: body.uid } })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "db.insert(tasks).values({ user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: body })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "db.insert(tasks).values({ user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { ...body } })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    // One row in a batch without the owner is enough to leak.
    { code: "db.insert(categories).values([{ name: a, user_id: user.id }, { name: b }])", errors: [{ message: /Insert into "categories" must set user_id: user\.id/ }] },
    // An insert whose values never appear in the chain.
    { code: "db.insert(tasks)", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    { code: "const t = tasks; tx.insert(t).values({ title })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
    // With duplicate set keys, the last one wins at runtime.
    { code: "db.insert(tasks).values({ user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { title }, set: { user_id: body.u } })", errors: [{ message: /Insert into "tasks" must set user_id: user\.id/ }] },
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
