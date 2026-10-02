import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { alerts } from "../schema/alerts";

// The route tests run against an in-memory mock, so these pin the guarantees
// that only the database enforces.
describe("alerts table definition", () => {
  const config = getTableConfig(alerts);

  it("deletes an alert with the event or task it belongs to", () => {
    const actions = Object.fromEntries(
      config.foreignKeys.map((fk) => [fk.reference().columns[0].name, fk.onDelete])
    );
    expect(actions).toEqual({ event_id: "cascade", task_id: "cascade" });
  });

  it("allows one alert per item and offset", () => {
    const uniques = config.uniqueConstraints.map((u) => u.columns.map((c) => c.name));
    expect(uniques).toContainEqual(["event_id", "offset_minutes"]);
    expect(uniques).toContainEqual(["task_id", "offset_minutes"]);
  });

  it("checks the offset and that exactly one item is named", () => {
    expect(config.checks.map((c) => c.name).sort()).toEqual(["alerts_exactly_one_item", "alerts_offset_allowed"]);
  });
});
