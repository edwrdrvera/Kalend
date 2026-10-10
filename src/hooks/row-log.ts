type Row = { id: string };

/**
 * What each list hook needs to know so a slow response can't undo a newer
 * change: which rows a list load must leave alone, and the saved id behind
 * each optimistic create. Bookkeeping only, so it never causes a render.
 */
export interface RowLog {
  /** The stamp a list load takes when it starts. */
  mark(): number;
  /** Rows a load stamped `since` must not overwrite: a request on them is in flight, or settled after the load began. */
  keepSince(since: number): ReadonlySet<string>;
  /** Marks rows changed now, for changes that need no request of their own. */
  touch(ids: Iterable<string>): void;
  /** Holds a row against list loads until the returned release is called. */
  hold(id: string): () => void;
  /** Registers an optimistic create. Edits on `tempId` wait until it lands or fails. */
  createPending(tempId: string): { land: (savedId: string) => void; fail: () => void };
  /**
   * Runs `send` with the row's saved id, holding the row until it settles.
   * For a row still being created this waits for the create, and resolves
   * null without sending anything if the create failed.
   */
  settle<R>(id: string, send: (savedId: string) => Promise<R>): Promise<R | null>;
}

export function createRowLog(): RowLog {
  let clock = 0;
  const inFlight = new Map<string, number>();
  const settledAt = new Map<string, number>();
  const savedIds = new Map<string, Promise<string | null>>();

  const hold = (id: string) => {
    inFlight.set(id, (inFlight.get(id) ?? 0) + 1);
    return () => {
      const left = (inFlight.get(id) ?? 1) - 1;
      if (left === 0) inFlight.delete(id);
      else inFlight.set(id, left);
      settledAt.set(id, ++clock);
    };
  };

  const holdWhile = async <R,>(id: string, work: () => Promise<R>): Promise<R> => {
    const release = hold(id);
    try {
      return await work();
    } finally {
      release();
    }
  };

  return {
    mark: () => ++clock,
    keepSince(since) {
      const keep = new Set(inFlight.keys());
      for (const [id, at] of settledAt) if (at > since) keep.add(id);
      return keep;
    },
    touch(ids) {
      for (const id of ids) hold(id)();
    },
    hold,
    createPending(tempId) {
      let resolve!: (savedId: string | null) => void;
      savedIds.set(tempId, new Promise((r) => (resolve = r)));
      return { land: resolve, fail: () => resolve(null) };
    },
    settle(id, send) {
      const created = savedIds.get(id);
      // Saved rows send in the same tick, so the request has started by the
      // time the caller's call returns.
      if (!created) return holdWhile(id, () => send(id));
      return holdWhile(id, async () => {
        const savedId = await created;
        return savedId === null ? null : holdWhile(savedId, () => send(savedId));
      });
    },
  };
}

/**
 * The server's list, except rows in `keep`: those keep their local copy, stay
 * gone if they were deleted locally, and are appended if the server doesn't
 * have them yet.
 */
export function mergeFetched<T extends Row>(server: T[], local: T[], keep: ReadonlySet<string>): T[] {
  if (keep.size === 0) return server;
  const localById = new Map(local.map((row) => [row.id, row]));
  const serverIds = new Set(server.map((row) => row.id));
  const merged = server.flatMap((row) => {
    if (!keep.has(row.id)) return [row];
    const mine = localById.get(row.id);
    return mine ? [mine] : [];
  });
  return [...merged, ...local.filter((row) => keep.has(row.id) && !serverIds.has(row.id))];
}

/**
 * Undoes a failed edit: restores only the fields it wrote, and only where the
 * row still shows what it wrote, so a later edit to the same field wins.
 */
export function rollbackFields<T>(row: T, before: T, attempted: Partial<T>): T {
  const restored = { ...row };
  for (const key of Object.keys(attempted) as (keyof T)[]) {
    if (Object.is(row[key], attempted[key])) restored[key] = before[key];
  }
  return restored;
}

/**
 * Swaps an optimistic row for the saved one. Fields the user changed while the
 * create was in flight stay, because their own requests are still on the way.
 */
export function landCreate<T extends Row>(rows: T[], tempId: string, sent: T, saved: T): T[] {
  return rows
    .filter((row) => row.id !== saved.id)
    .map((row) => {
      if (row.id !== tempId) return row;
      const landed = { ...saved };
      for (const key of Object.keys(row) as (keyof T)[]) {
        if (key !== "id" && !Object.is(row[key], sent[key])) landed[key] = row[key];
      }
      return landed;
    });
}
