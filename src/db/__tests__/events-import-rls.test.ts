import { afterAll, describe, expect, it } from "bun:test";
import postgres from "postgres";

// The import route connects as the owner, which skips row policies. This file
// connects as kalend_app with app.user_id set, so the policy is what decides
// which imported rows are visible. It skips without APP_DATABASE_URL.
const appUrl = process.env.APP_DATABASE_URL;
const ownerUrl = process.env.DATABASE_URL;

const ALICE = "66666666-6666-4666-8666-666666666666";
const BOB = "77777777-7777-4777-8777-777777777777";

type Tx = postgres.Sql;
const asSql = (tx: postgres.TransactionSql) => tx as unknown as Tx;
const asTransaction = (tx: Tx) => tx as unknown as postgres.TransactionSql;

class Rollback extends Error {}

describe.skipIf(!appUrl || !ownerUrl)("imported events stay inside the caller's calendar", () => {
  const app = postgres(appUrl!, { prepare: false, onnotice: () => {} });
  const owner = postgres(ownerUrl!, { prepare: false, onnotice: () => {} });

  afterAll(async () => {
    await owner`delete from events where user_id in (${ALICE}, ${BOB})`;
    await app.end();
    await owner.end();
  });

  async function rejected(tx: Tx, statement: (inner: Tx) => PromiseLike<unknown>, code: string) {
    let caught: unknown;
    try {
      await asTransaction(tx).savepoint(async (inner) => {
        await statement(asSql(inner));
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe(code);
  }

  it("keeps the first imported copy and hides another student's row", async () => {
    await owner`
      insert into events (user_id, title, start_at, end_at, import_uid, import_occurrence)
      values (${BOB}, 'Secret', now(), now() + interval '1 hour', 'secret@school', '')
    `;

    await app
      .begin(async (tx) => {
        const sql = asSql(tx);
        await sql`select set_config('app.user_id', ${ALICE}, true)`;

        const [first] = await sql<{ id: string; title: string }[]>`
          insert into events (user_id, title, start_at, end_at, import_uid, import_occurrence)
          values (${ALICE}, 'Seminar', now(), now() + interval '1 hour', 'seminar@school', '')
          returning id, title
        `;
        const again = await sql<{ id: string }[]>`
          insert into events (user_id, title, start_at, end_at, import_uid, import_occurrence)
          values (${ALICE}, 'Seminar renamed', now(), now() + interval '1 hour', 'seminar@school', '')
          on conflict (user_id, import_uid, import_occurrence) where import_uid is not null do nothing
          returning id
        `;
        expect(again).toHaveLength(0);

        const visible = await sql<{ title: string }[]>`
          select title from events where user_id in (${ALICE}, ${BOB}) order by title
        `;
        expect(visible.map((row) => row.title)).toEqual(["Seminar"]);

        const [kept] = await sql<{ title: string }[]>`
          select title from events where id = ${first.id}
        `;
        expect(kept.title).toBe("Seminar");

        await rejected(
          sql,
          (inner) => inner`
            insert into events (user_id, title, start_at, end_at, import_uid, import_occurrence)
            values (${BOB}, 'Not mine', now(), now() + interval '1 hour', 'not-mine@school', '')
          `,
          "42501"
        );

        const [typed] = await sql<{ import_uid: string | null; import_occurrence: string | null }[]>`
          insert into events (user_id, title, start_at, end_at)
          values (${ALICE}, 'Typed by hand', now(), now() + interval '1 hour')
          returning import_uid, import_occurrence
        `;
        expect(typed).toEqual({ import_uid: null, import_occurrence: null });

        await rejected(
          sql,
          (inner) => inner`
            insert into events (user_id, title, start_at, end_at, import_uid)
            values (${ALICE}, 'Half', now(), now() + interval '1 hour', 'half@school')
          `,
          "23514"
        );

        throw new Rollback();
      })
      .catch((error) => {
        if (!(error instanceof Rollback)) throw error;
      });

    const [secret] = await owner<{ title: string }[]>`
      select title from events where user_id = ${BOB} and import_uid = 'secret@school'
    `;
    expect(secret.title).toBe("Secret");
    const alice = await owner<{ title: string }[]>`
      select title from events where user_id = ${ALICE}
    `;
    expect(alice).toHaveLength(0);
  });
});
