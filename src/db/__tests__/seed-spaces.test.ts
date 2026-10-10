import { afterAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// Runs the real seed scripts as the CLI does, against the scratch database in
// SCHEMA_TEST_DATABASE_URL. Each test seeds its own random user and deletes
// that user's rows afterwards. Without the URL the suite skips.
const url = process.env.SCHEMA_TEST_DATABASE_URL;

function runSeed(script: "seed" | "seed-spaces", userId: string) {
  const run = Bun.spawnSync([process.execPath, "run", new URL(`../${script}.ts`, import.meta.url).pathname], {
    env: { ...process.env, DATABASE_URL: url, SEED_USER_ID: userId },
  });
  const stderr = run.stderr.toString();
  return {
    exitCode: run.exitCode,
    constraint: stderr.match(/constraint_name: "(\w+)"/)?.[1] ?? null,
  };
}

describe.skipIf(!url)("seed scripts", () => {
  const sql = postgres(url!, { prepare: false, onnotice: () => {} });
  const users: string[] = [];

  async function seededUser() {
    const userId = crypto.randomUUID();
    users.push(userId);
    expect(runSeed("seed", userId).exitCode).toBe(0);
    return userId;
  }

  afterAll(async () => {
    for (const userId of users) {
      await sql`delete from tasks where user_id = ${userId}`;
      await sql`delete from events where user_id = ${userId}`;
      await sql`delete from groups where user_id = ${userId}`;
      await sql`delete from categories where user_id = ${userId}`;
    }
    await sql.end();
  });

  it("loads no event that ends at or before it starts", async () => {
    const userId = await seededUser();
    const backwards = await sql`
      select title, start_at, end_at from events where user_id = ${userId} and end_at <= start_at`;
    expect(backwards).toEqual([]);

    const [due] = await sql`
      select start_at, end_at from events where user_id = ${userId} and title = 'Algorithms Problem Set Due'`;
    expect(due).toEqual({
      start_at: new Date("2026-09-11T23:45:00-05:00"),
      end_at: new Date("2026-09-11T23:59:00-05:00"),
    });
  }, 30_000);

  it("re-runs the Spaces seed after the user moves items into a Group", async () => {
    const userId = await seededUser();
    expect(runSeed("seed-spaces", userId).exitCode).toBe(0);

    const [personal] = await sql`select id from categories where user_id = ${userId} and name = 'Personal'`;
    const [group] = await sql`
      insert into groups (user_id, category_id, name) values (${userId}, ${personal.id}, 'Errands') returning id`;
    const [event] = await sql`
      update events set category_id = ${personal.id}, group_id = ${group.id}
      where id = (select id from events where user_id = ${userId} and title = 'Gym Session' order by start_at limit 1)
      returning id`;
    const [task] = await sql`
      insert into tasks (user_id, title, category_id, group_id)
      values (${userId}, 'Read', ${personal.id}, ${group.id}) returning id`;

    expect(runSeed("seed-spaces", userId)).toEqual({ exitCode: 0, constraint: null });

    const grouped = await sql`
      select category_id, group_id from events where id = ${event.id}
      union all
      select category_id, group_id from tasks where id = ${task.id}`;
    expect(grouped).toEqual([
      { category_id: personal.id, group_id: group.id },
      { category_id: personal.id, group_id: group.id },
    ]);
    const [{ spaces }] = await sql`select count(*)::int as spaces from categories where user_id = ${userId}`;
    expect(spaces).toBe(6);
  }, 30_000);

  it("leaves no Space or link behind when a Spaces seed run fails partway", async () => {
    const userId = await seededUser();
    const trigger = `fail_seed_${userId.replaceAll("-", "")}`;
    await sql.unsafe(`
      create function ${trigger}() returns trigger language plpgsql
        as $$ begin raise exception 'forced seed failure'; end $$;
      create trigger ${trigger} before insert on tasks for each row
        when (new.user_id = '${userId}') execute function ${trigger}();`);
    try {
      expect(runSeed("seed-spaces", userId).exitCode).toBe(1);
    } finally {
      await sql.unsafe(`drop trigger ${trigger} on tasks; drop function ${trigger}();`);
    }

    const [after] = await sql`
      select
        (select count(*)::int from categories where user_id = ${userId}) as spaces,
        (select count(*)::int from events where user_id = ${userId} and category_id is not null) as linked`;
    expect(after).toEqual({ spaces: 0, linked: 0 });
  }, 30_000);
});
