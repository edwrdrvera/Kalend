import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// Proves one user cannot see or change another user's rows when connected as
// the app role. Skips unless both the owner URL and the app role URL are set.
// CI sets both. The rows are removed at the end.
const ownerUrl = process.env.DATABASE_URL;
const appUrl = process.env.APP_DATABASE_URL;

type QueryValue = NonNullable<Parameters<postgres.Sql["unsafe"]>[1]>[number];

// postgres.js types a transaction with Omit, which drops the tagged-template
// call. unsafe is still on the transaction, so build the same $1 parameters here.
function query(tx: postgres.TransactionSql) {
  return (strings: TemplateStringsArray, ...values: readonly QueryValue[]) => {
    const text = strings.reduce(
      (sqlText, part, index) => (index === 0 ? part : `${sqlText}$${index}${part}`),
      "",
    );
    return tx.unsafe(text, [...values]);
  };
}

type Query = ReturnType<typeof query>;

const codeOf = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
};

async function expectCode(run: () => Promise<unknown>, code: string) {
  try {
    await run();
  } catch (error) {
    expect(codeOf(error)).toBe(code);
    return;
  }
  throw new Error(`expected Postgres error ${code}`);
}

interface Fixture {
  userA: string;
  userB: string;
  categoryA: string;
  categoryB: string;
  groupA: string;
  groupB: string;
  eventA: string;
  eventB: string;
  taskA: string;
  taskB: string;
  alertA: string;
  alertB: string;
  email: string;
}

describe.skipIf(!ownerUrl || !appUrl)("row policies isolate two users", () => {
  const owner = postgres(ownerUrl!, { prepare: false });
  const app = postgres(appUrl!, { prepare: false, max: 1 });
  let fixture: Fixture;
  // Recorded before the inserts, so a failure partway through still deletes
  // whatever rows were written.
  const created = { userIds: [] as string[], email: null as string | null };

  beforeAll(async () => {
    const userA = crypto.randomUUID();
    const userB = crypto.randomUUID();
    const email = `waitlist-${userA}@example.com`;
    created.userIds.push(userA, userB);
    created.email = email;

    const [categoryA] = await owner`
      insert into categories (user_id, name) values (${userA}, 'Space A') returning id
    `;
    const [categoryB] = await owner`
      insert into categories (user_id, name) values (${userB}, 'Space B') returning id
    `;
    const [groupA] = await owner`
      insert into groups (user_id, category_id, name)
      values (${userA}, ${categoryA.id}, 'Group A') returning id
    `;
    const [groupB] = await owner`
      insert into groups (user_id, category_id, name)
      values (${userB}, ${categoryB.id}, 'Group B') returning id
    `;
    const [eventA] = await owner`
      insert into events (user_id, title, start_at, end_at, category_id, group_id)
      values (${userA}, 'Event A', now(), now() + interval '1 hour', ${categoryA.id}, ${groupA.id})
      returning id
    `;
    const [eventB] = await owner`
      insert into events (user_id, title, start_at, end_at, category_id, group_id)
      values (${userB}, 'Event B', now(), now() + interval '1 hour', ${categoryB.id}, ${groupB.id})
      returning id
    `;
    const [taskA] = await owner`
      insert into tasks (user_id, title, category_id, group_id)
      values (${userA}, 'Task A', ${categoryA.id}, ${groupA.id}) returning id
    `;
    const [taskB] = await owner`
      insert into tasks (user_id, title, category_id, group_id)
      values (${userB}, 'Task B', ${categoryB.id}, ${groupB.id}) returning id
    `;
    const [alertA] = await owner`
      insert into alerts (user_id, event_id, offset_minutes, fire_at)
      values (${userA}, ${eventA.id}, 15, now()) returning id
    `;
    const [alertB] = await owner`
      insert into alerts (user_id, event_id, offset_minutes, fire_at)
      values (${userB}, ${eventB.id}, 15, now()) returning id
    `;

    fixture = {
      userA,
      userB,
      categoryA: categoryA.id,
      categoryB: categoryB.id,
      groupA: groupA.id,
      groupB: groupB.id,
      eventA: eventA.id,
      eventB: eventB.id,
      taskA: taskA.id,
      taskB: taskB.id,
      alertA: alertA.id,
      alertB: alertB.id,
      email,
    };
  });

  afterAll(async () => {
    try {
      if (created.userIds.length > 0) {
        const ids = created.userIds;
        await owner`delete from alerts where user_id in ${owner(ids)}`;
        await owner`delete from events where user_id in ${owner(ids)}`;
        await owner`delete from tasks where user_id in ${owner(ids)}`;
        await owner`delete from groups where user_id in ${owner(ids)}`;
        await owner`delete from categories where user_id in ${owner(ids)}`;
      }
      if (created.email) await owner`delete from waitlist where email = ${created.email}`;
    } finally {
      await Promise.all([app.end(), owner.end()]);
    }
  });

  async function asUser<T>(userId: string | null, work: (tx: Query) => Promise<T>): Promise<T> {
    // begin() types its result as an unwrapped promise array. A generic T is
    // not that unwrap, even though work already returned T.
    const result = await app.begin(async (tx) => {
      const run = query(tx);
      if (userId !== null) await run`select set_config('app.user_id', ${userId}, true)`;
      return work(run);
    });
    return result as T;
  }

  it("connects as a role that cannot skip row policies", async () => {
    const [role] = await app`
      select current_user as name, rolbypassrls from pg_roles where rolname = current_user
    `;
    expect(role.name).toBe("kalend_app");
    expect(role.rolbypassrls).toBe(false);
  });

  it("returns only the caller's rows from each owned table", async () => {
    const rows = await asUser(fixture.userA, async (tx) => ({
      categories: await tx`select id from categories where id in (${fixture.categoryA}, ${fixture.categoryB})`,
      groups: await tx`select id from groups where id in (${fixture.groupA}, ${fixture.groupB})`,
      events: await tx`select id from events where id in (${fixture.eventA}, ${fixture.eventB})`,
      tasks: await tx`select id from tasks where id in (${fixture.taskA}, ${fixture.taskB})`,
      alerts: await tx`select id from alerts where id in (${fixture.alertA}, ${fixture.alertB})`,
    }));

    expect(rows.categories.map((row) => row.id)).toEqual([fixture.categoryA]);
    expect(rows.groups.map((row) => row.id)).toEqual([fixture.groupA]);
    expect(rows.events.map((row) => row.id)).toEqual([fixture.eventA]);
    expect(rows.tasks.map((row) => row.id)).toEqual([fixture.taskA]);
    expect(rows.alerts.map((row) => row.id)).toEqual([fixture.alertA]);
  });

  it("changes nothing when it updates or deletes the other user's rows", async () => {
    const counts = await asUser(fixture.userA, async (tx) => ({
      events: (await tx`update events set title = 'stolen' where id = ${fixture.eventB}`).count,
      categories: (await tx`update categories set name = 'stolen' where id = ${fixture.categoryB}`).count,
      groups: (await tx`update groups set name = 'stolen' where id = ${fixture.groupB}`).count,
      tasks: (await tx`delete from tasks where id = ${fixture.taskB}`).count,
      alerts: (await tx`delete from alerts where id = ${fixture.alertB}`).count,
    }));
    expect(Number(counts.events)).toBe(0);
    expect(Number(counts.categories)).toBe(0);
    expect(Number(counts.groups)).toBe(0);
    expect(Number(counts.tasks)).toBe(0);
    expect(Number(counts.alerts)).toBe(0);

    const [event] = await owner`select title from events where id = ${fixture.eventB}`;
    const [category] = await owner`select name from categories where id = ${fixture.categoryB}`;
    const [group] = await owner`select name from groups where id = ${fixture.groupB}`;
    const [task] = await owner`select id from tasks where id = ${fixture.taskB}`;
    const [alert] = await owner`select id from alerts where id = ${fixture.alertB}`;
    expect(event.title).toBe("Event B");
    expect(category.name).toBe("Space B");
    expect(group.name).toBe("Group B");
    expect(task.id).toBe(fixture.taskB);
    expect(alert.id).toBe(fixture.alertB);
  });

  it("rejects an insert that names the other user", async () => {
    await expectCode(
      () => asUser(fixture.userA, (tx) => tx`insert into categories (user_id, name) values (${fixture.userB}, 'nope')`),
      "42501",
    );
  });

  it("rejects an event that points at the other user's space", async () => {
    // The policy allows the caller's own user id. The space key then rejects
    // the other user's space, because that key includes the owner.
    await expectCode(
      () =>
        asUser(
          fixture.userA,
          (tx) => tx`
            insert into events (user_id, title, start_at, end_at, category_id)
            values (${fixture.userA}, 'cross', now(), now() + interval '1 hour', ${fixture.categoryB})
          `,
        ),
      "23503",
    );
  });

  it("returns no rows and rejects inserts when the caller id is unset", async () => {
    const rows = await asUser(null, async (tx) => ({
      categories: await tx`select id from categories where id in (${fixture.categoryA}, ${fixture.categoryB})`,
      groups: await tx`select id from groups where id in (${fixture.groupA}, ${fixture.groupB})`,
      events: await tx`select id from events where id in (${fixture.eventA}, ${fixture.eventB})`,
      tasks: await tx`select id from tasks where id in (${fixture.taskA}, ${fixture.taskB})`,
      alerts: await tx`select id from alerts where id in (${fixture.alertA}, ${fixture.alertB})`,
    }));
    expect(rows.categories).toHaveLength(0);
    expect(rows.groups).toHaveLength(0);
    expect(rows.events).toHaveLength(0);
    expect(rows.tasks).toHaveLength(0);
    expect(rows.alerts).toHaveLength(0);

    await expectCode(
      () => asUser(null, (tx) => tx`insert into categories (user_id, name) values (${fixture.userA}, 'unset')`),
      "42501",
    );
  });

  it("does not keep the caller id after the transaction commits", async () => {
    const seen = await app.begin(async (tx) => {
      const run = query(tx);
      await run`select set_config('app.user_id', ${fixture.userA}, true)`;
      return run`select id from events where id = ${fixture.eventA}`;
    });
    expect(seen).toHaveLength(1);

    const later = await app.begin(async (tx) => query(tx)`select id from events where id in (${fixture.eventA}, ${fixture.eventB})`);
    expect(later).toHaveLength(0);
  });

  it("lets the app role insert a waitlist row, not read it back", async () => {
    await app`insert into waitlist (email) values (${fixture.email})`;

    // Insert is granted. Select is not, so a read is permission denied.
    await expectCode(
      () => app`select email from waitlist where email = ${fixture.email}`,
      "42501",
    );

    await expectCode(
      () => app`insert into waitlist (email) values (${fixture.email})`,
      "23505",
    );
  });
});
