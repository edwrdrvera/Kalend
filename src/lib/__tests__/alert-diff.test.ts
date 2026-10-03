import { describe, expect, it } from "bun:test";
import type { CalendarAlert } from "../calendar-types";
import type { AlertOffset } from "../alerts";
import { alertSteps, alertsByItem } from "../alert-diff";

function alert(id: string, offset: AlertOffset, item: { event?: string; task?: string }): CalendarAlert {
  return {
    id,
    event_id: item.event ?? null,
    task_id: item.task ?? null,
    offset_minutes: offset,
    fire_at: "2026-10-02T12:00:00.000Z",
    fired_at: null,
  };
}

describe("alertSteps", () => {
  it("does nothing when the wanted alert is already stored", () => {
    expect(alertSteps([alert("a1", 15, { event: "e1" })], 15)).toEqual([]);
    expect(alertSteps([], null)).toEqual([]);
  });

  it("creates the alert when the item has none", () => {
    expect(alertSteps([], 60)).toEqual([{ type: "create", offset: 60 }]);
  });

  it("deletes the stored alert when the user clears it", () => {
    expect(alertSteps([alert("a1", 15, { event: "e1" })], null)).toEqual([{ type: "delete", id: "a1" }]);
  });

  it("creates the new alert before deleting the old one", () => {
    expect(alertSteps([alert("a1", 15, { event: "e1" })], 5)).toEqual([
      { type: "create", offset: 5 },
      { type: "delete", id: "a1" },
    ]);
  });

  it("keeps the matching alert and deletes the extras when an item has several", () => {
    const stored = [alert("a1", 5, { task: "t1" }), alert("a2", 15, { task: "t1" })];
    expect(alertSteps(stored, 15)).toEqual([{ type: "delete", id: "a1" }]);
    expect(alertSteps(stored, null)).toEqual([
      { type: "delete", id: "a1" },
      { type: "delete", id: "a2" },
    ]);
  });
});

describe("alertsByItem", () => {
  it("maps each event and task id to its alert", () => {
    const map = alertsByItem([alert("a1", 5, { event: "e1" }), alert("a2", 60, { task: "t1" })]);
    expect(map.get("e1")?.id).toBe("a1");
    expect(map.get("t1")?.id).toBe("a2");
    expect(map.get("other")).toBeUndefined();
  });

  it("picks the smallest offset when an item has several", () => {
    const map = alertsByItem([alert("late", 1440, { event: "e1" }), alert("early", 5, { event: "e1" })]);
    expect(map.get("e1")?.id).toBe("early");
  });
});
