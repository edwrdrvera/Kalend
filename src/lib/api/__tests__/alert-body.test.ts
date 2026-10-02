import { describe, expect, it } from "bun:test";
import { parseAlertCreate } from "@/lib/api/alert-body";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseAlertCreate", () => {
  it("names an event target", () => {
    expect(parseAlertCreate({ event_id: ID, offset_minutes: 15 })).toEqual({
      ok: true,
      value: { target: { kind: "event", id: ID }, offset_minutes: 15 },
    });
  });

  it("names a task target", () => {
    expect(parseAlertCreate({ task_id: ID, offset_minutes: 0 })).toEqual({
      ok: true,
      value: { target: { kind: "task", id: ID }, offset_minutes: 0 },
    });
  });

  it.each([
    [{ offset_minutes: 5 }, "event_id or task_id is required"],
    [{ event_id: ID, task_id: ID, offset_minutes: 5 }, "Name either event_id or task_id, not both"],
    [{ event_id: ID }, "offset_minutes is required"],
    [{ event_id: ID, offset_minutes: 30 }, "offset_minutes must be one of 0, 5, 15, 60, 1440"],
    [{ task_id: 7, offset_minutes: 5 }, "task_id must be a valid identifier"],
    [{ event_id: ID, offset_minutes: 5, extra: 1 }, "Unknown field: extra"],
    [[], "Request body must be an object"],
    [null, "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parseAlertCreate(body)).toEqual({ ok: false, error });
  });
});
