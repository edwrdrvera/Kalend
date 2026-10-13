import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { events } from "../schema/events";

describe("events import identity", () => {
  const config = getTableConfig(events);

  it("stores the calendar uid and the occurrence on the event", () => {
    const names = config.columns.map((column) => column.name);
    expect(names).toContain("import_uid");
    expect(names).toContain("import_occurrence");
  });

  it("allows one imported occurrence per user", () => {
    const index = config.indexes.find((entry) => entry.config.name === "events_import_identity_idx");
    expect(index?.config.unique).toBe(true);
    expect(index?.config.columns.map((column) => ("name" in column ? column.name : null))).toEqual([
      "user_id",
      "import_uid",
      "import_occurrence",
    ]);
  });

  it("requires the uid and the occurrence to be set together", () => {
    expect(config.checks.map((entry) => entry.name)).toContain("events_import_identity_pair");
  });
});
