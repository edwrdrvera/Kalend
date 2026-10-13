import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// Proves one user cannot see or change another user's rows when connected as
// the app role. Skips unless both the owner URL and the app role URL are set.
// CI sets both. The rows are removed at the end.
const ownerUrl = process.env.DATABASE_URL;
const appUrl = process.env.APP_DATABASE_URL;

type Sql = postgres.Sql;
type Tx = postgres.TransactionSql;

const asSql = (tx: Tx) => tx as unknown as Sql;

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

  beforeAll(async () => {
    const userA = crypto.randomUUID();
    const userB = crypto.randomUUID();
    const email = `waitlist-${userA}@example.com`;

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
    if (fixture) {
      const ids = [fixture.userA, fixture.userB];
      await owner`delete from alerts where user_id in ${owner(ids)}`;
      await owner`delete from events where user_id in ${owner(ids)}`;
      await owner`delete from tasks where user_id in ${owner(ids)}`;
      await owner`delete from groups where user_id in ${owner(ids)}`;
      await owner`delete from categories where user_id in ${owner(ids)}`;
      await owner`delete from waitlist where email = ${fixture.email}`;
    }
    await app.end();
    await owner.end();
  });

  async function asUser<T>(userId: string | null, work: (tx: Sql) => Promise<T>): Promise<T> {
    const result = await app.begin(async (tx) => {
      if (userId !== null) await asSql(tx)`select set_config('app.user_id', ${userId}, true)`;
      return work(asSql(tx));
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
      updated: (await tx`update events set title = 'stolen' where id = ${fixture.eventB}`).count,
      deleted: (await tx`delete from tasks where id = ${fixture.taskB}`).count,
    }));
    expect(Number(counts.updated)).toBe(0);
    expect(Number(counts.deleted)).toBe(0);

    const [event] = await owner`select title from events where id = ${fixture.eventB}`;
    const [task] = await owner`select id from tasks where id = ${fixture.taskB}`;
    expect(event.title).toBe("Event B");
    expect(task.id).toBe(fixture.taskB);
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
      await asSql(tx)`select set_config('app.user_id', ${fixture.userA}, true)`;
      return asSql(tx)`select id from events where id = ${fixture.eventA}`;
    });
    expect(seen).toHaveLength(1);

    const later = await app.begin(async (tx) => asSql(tx)`select id from events where id in (${fixture.eventA}, ${fixture.eventB})`);
    expect(later).toHaveLength(0);
  });

  it("lets the app role insert a waitlist row, not read it back", async () => {
    await app`insert into waitlist (email) values (${fixture.email})`;

    let visible: { email: string }[] = [];
    try {
      visible = await app`select email from waitlist where email = ${fixture.email}`;
    } catch (error) {
      expect(codeOf(error)).toBe("42501");
      visible = [];
    }
    expect(visible).toHaveLength(0);

    await expectCode(
      () => app`insert into waitlist (email) values (${fixture.email})`,
      "23505",
    );
  });
});
