import { afterAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// The route tests run against an in-memory mock with no constraints, so the
// rules that keep an item's Space and Group consistent are only provable on a
// real database. Point SCHEMA_TEST_DATABASE_URL at a scratch Postgres that has
// every migration applied (not the shared database: these tests write rows,
// though each one is rolled back):
//   SCHEMA_TEST_DATABASE_URL=postgres://... bun test src/db/__tests__/groups-schema.test.ts
// Without it they skip, the same way rls.test.ts skips without DATABASE_URL.
const url = process.env.SCHEMA_TEST_DATABASE_URL;

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

// postgres.js types a transaction as Omit<Sql, ...>, which drops the tagged-template call signature.
type Tx = postgres.Sql;
const asSql = (tx: postgres.TransactionSql) => tx as unknown as Tx;
const asTransaction = (tx: Tx) => tx as unknown as postgres.TransactionSql;

class Rollback extends Error {}

describe.skipIf(!url)("Groups schema constraints", () => {
  const sql = postgres(url!, { prepare: false, onnotice: () => {} });

  afterAll(async () => {
    await sql.end();
  });

  async function inRolledBackTransaction(body: (tx: Tx) => Promise<void>) {
    await sql
      .begin(async (tx) => {
        await body(asSql(tx));
        throw new Rollback();
      })
      .catch((error) => {
        if (!(error instanceof Rollback)) throw error;
      });
  }

  async function space(tx: Tx, userId: string, name: string) {
    const [row] = await tx`insert into categories (user_id, name) values (${userId}, ${name}) returning id`;
    return row.id as string;
  }

  async function group(tx: Tx, userId: string, spaceId: string, name = "BIO 102") {
    const [row] = await tx`insert into groups (user_id, category_id, name) values (${userId}, ${spaceId}, ${name}) returning id`;
    return row.id as string;
  }

  async function event(tx: Tx, userId: string, spaceId: string | null, groupId: string | null) {
    const [row] = await tx`
      insert into events (user_id, title, start_at, end_at, category_id, group_id)
      values (${userId}, 'e', now(), now() + interval '1 hour', ${spaceId}, ${groupId})
      returning id`;
    return row.id as string;
  }

  async function task(tx: Tx, userId: string, spaceId: string | null, groupId: string | null) {
    const [row] = await tx`
      insert into tasks (user_id, title, category_id, group_id) values (${userId}, 't', ${spaceId}, ${groupId}) returning id`;
    return row.id as string;
  }

  async function rejected(tx: Tx, statement: (inner: Tx) => PromiseLike<unknown>, constraint: string) {
    let caught: unknown;
    try {
      await asTransaction(tx).savepoint(async (inner) => {
        await statement(asSql(inner));
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect((caught as { constraint_name?: string }).constraint_name).toBe(constraint);
  }

  it("keeps ON DELETE SET NULL (group_id) on both item keys", async () => {
    const rows = await sql`
      select conname, pg_get_constraintdef(oid) as def from pg_constraint
      where conname in ('events_group_membership_fk', 'tasks_group_membership_fk')`;
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.def).toContain("ON DELETE SET NULL (group_id)");
  });

  it("keeps ON DELETE SET NULL (category_id) on both Space keys", async () => {
    const rows = await sql`
      select conname, pg_get_constraintdef(oid) as def from pg_constraint
      where conname in ('events_space_owner_fk', 'tasks_space_owner_fk')`;
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.def).toContain("ON DELETE SET NULL (category_id)");
  });

  it("rejects an item in another user's Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const alicesSpace = await space(tx, ALICE, "School");
      await rejected(tx, (t) => event(t, BOB, alicesSpace, null), "events_space_owner_fk");
      await rejected(tx, (t) => task(t, BOB, alicesSpace, null), "tasks_space_owner_fk");
      const bobsEvent = await event(tx, BOB, null, null);
      await rejected(
        tx,
        (t) => t`update events set category_id = ${alicesSpace} where id = ${bobsEvent}`,
        "events_space_owner_fk"
      );
    });
  });

  it("moves an item between two of its owner's Spaces", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const work = await space(tx, ALICE, "Work");
      const id = await event(tx, ALICE, school, null);
      await tx`update events set category_id = ${work} where id = ${id}`;
      const [e] = await tx`select category_id from events where id = ${id}`;
      expect(e.category_id).toBe(work);
    });
  });

  it("deleting a Space keeps its ungrouped items and their owner", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const eventId = await event(tx, ALICE, school, null);
      const taskId = await task(tx, ALICE, school, null);
      await tx`delete from categories where id = ${school}`;
      const [e] = await tx`select user_id, category_id from events where id = ${eventId}`;
      const [t] = await tx`select user_id, category_id from tasks where id = ${taskId}`;
      expect(e).toEqual({ user_id: ALICE, category_id: null });
      expect(t).toEqual({ user_id: ALICE, category_id: null });
    });
  });

  // Postgres clears the item's Space before the Group cascade clears its group_id,
  // so the item briefly has a Group and no Space. Only the delete route can remove a
  // Space that still has grouped items, because it detaches them first.
  it("rejects a raw delete of a Space that still has grouped items and changes nothing", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const bio = await group(tx, ALICE, school);
      const eventId = await event(tx, ALICE, school, bio);
      await rejected(tx, (t) => t`delete from categories where id = ${school}`, "events_group_needs_space");
      const [e] = await tx`select category_id, group_id from events where id = ${eventId}`;
      expect(e).toEqual({ category_id: school, group_id: bio });
    });
  });

  it("rejects a Group under another user's Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const bobsSpace = await space(tx, BOB, "Other");
      await rejected(tx, (t) => group(t, ALICE, bobsSpace), "groups_space_owner_fk");
    });
  });

  it("rejects an item whose Space is not its Group's Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const work = await space(tx, ALICE, "Work");
      const bio = await group(tx, ALICE, school);
      await rejected(tx, (t) => event(t, ALICE, work, bio), "events_group_membership_fk");
      await rejected(tx, (t) => task(t, ALICE, work, bio), "tasks_group_membership_fk");
    });
  });

  it("rejects a Group on an item with no Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const bio = await group(tx, ALICE, await space(tx, ALICE, "School"));
      await rejected(tx, (t) => event(t, ALICE, null, bio), "events_group_needs_space");
      await rejected(tx, (t) => task(t, ALICE, null, bio), "tasks_group_needs_space");
    });
  });

  it("rejects another user's item that points at my Group", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const bio = await group(tx, ALICE, school);
      await rejected(tx, (t) => event(t, BOB, school, bio), "events_group_membership_fk");
      await rejected(tx, (t) => task(t, BOB, school, bio), "tasks_group_membership_fk");
    });
  });

  it("accepts grouped, Space-only and unassigned items", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const bio = await group(tx, ALICE, school);
      await event(tx, ALICE, school, bio);
      await task(tx, ALICE, school, bio);
      await event(tx, ALICE, school, null);
      await event(tx, ALICE, null, null);
    });
  });

  it("rejects moving a grouped item to another Space or clearing its Space while it keeps the Group", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const work = await space(tx, ALICE, "Work");
      const bio = await group(tx, ALICE, school);
      const id = await event(tx, ALICE, school, bio);
      await rejected(tx, (t) => t`update events set category_id = ${work} where id = ${id}`, "events_group_membership_fk");
      await rejected(tx, (t) => t`update events set category_id = null where id = ${id}`, "events_group_needs_space");
    });
  });

  it("deleting a Group keeps its items in the Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const bio = await group(tx, ALICE, school);
      const eventId = await event(tx, ALICE, school, bio);
      const taskId = await task(tx, ALICE, school, bio);
      await tx`delete from groups where id = ${bio}`;
      const [e] = await tx`select category_id, group_id from events where id = ${eventId}`;
      const [t] = await tx`select category_id, group_id from tasks where id = ${taskId}`;
      expect(e).toEqual({ category_id: school, group_id: null });
      expect(t).toEqual({ category_id: school, group_id: null });
    });
  });

  it("lets the route detach items and drop Groups before deleting a Space", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      const bio = await group(tx, ALICE, school);
      const eventId = await event(tx, ALICE, school, bio);
      await tx`update events set category_id = null, group_id = null where category_id = ${school}`;
      await tx`delete from groups where category_id = ${school}`;
      await tx`delete from categories where id = ${school}`;
      const [e] = await tx`select category_id, group_id from events where id = ${eventId}`;
      expect(e).toEqual({ category_id: null, group_id: null });
    });
  });

  it("rejects blank and over-long Group names", async () => {
    await inRolledBackTransaction(async (tx) => {
      const school = await space(tx, ALICE, "School");
      await rejected(tx, (t) => group(t, ALICE, school, "   "), "groups_name_not_blank");
      await rejected(tx, (t) => group(t, ALICE, school, "x".repeat(101)), "groups_name_not_blank");
      await group(tx, ALICE, school, "x".repeat(100));
      await group(tx, ALICE, school, "BIO 102");
      await group(tx, ALICE, school, "BIO 102");
    });
  });
});
