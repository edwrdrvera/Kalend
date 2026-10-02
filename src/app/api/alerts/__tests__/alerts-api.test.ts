import { describe, expect, it, beforeEach } from "bun:test";
import { setupMockDb, type MockDbState, type MockAuthUser } from "@/test-utils/mock-db";

interface MockAlert {
  id: string;
  user_id: string;
  event_id: string | null;
  task_id: string | null;
  offset_minutes: number;
  fire_at: Date;
  fired_at: Date | null;
}
interface MockItem {
  id: string;
  user_id: string;
  title: string;
  start_at?: Date;
  due_at?: Date | null;
}

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "11111111-1111-4111-8111-222222222222";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";
const TASK_ID = "33333333-3333-4333-8333-111111111111";
const UNDATED_TASK_ID = "33333333-3333-4333-8333-222222222222";
const OTHER_TASK_ID = "33333333-3333-4333-8333-333333333333";
const MY_ALERT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-111111111111";
const OTHER_ALERT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-222222222222";

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };

const alertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };
const eventState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };
const taskState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("alert-", alertState, () => mockCurrentUser, {}, false, () => [], {
  events: eventState,
  tasks: taskState,
});

import { GET, POST } from "../route";
import { DELETE } from "../[id]/route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/alerts", { method: "POST", body: JSON.stringify(body) }));
const del = (id: string) =>
  DELETE(new Request(`http://localhost/api/alerts/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

describe("Alerts API", () => {
  beforeEach(() => {
    mockCurrentUser = { id: ME, email: "student@university.edu" };
    eventState.rows = [
      { id: EVENT_ID, user_id: ME, title: "CS 101 Lecture", start_at: new Date("2026-08-10T10:00:00Z") },
      { id: OTHER_EVENT_ID, user_id: OTHER, title: "Private", start_at: new Date("2026-08-10T12:00:00Z") },
    ];
    taskState.rows = [
      { id: TASK_ID, user_id: ME, title: "Essay", due_at: new Date("2026-08-15T23:00:00Z") },
      { id: UNDATED_TASK_ID, user_id: ME, title: "Someday", due_at: null },
      { id: OTHER_TASK_ID, user_id: OTHER, title: "Private task", due_at: new Date("2026-08-15T23:00:00Z") },
    ];
    alertState.rows = [
      { id: MY_ALERT_ID, user_id: ME, event_id: EVENT_ID, task_id: null, offset_minutes: 15, fire_at: new Date("2026-08-10T09:45:00Z"), fired_at: null },
      { id: OTHER_ALERT_ID, user_id: OTHER, event_id: OTHER_EVENT_ID, task_id: null, offset_minutes: 5, fire_at: new Date("2026-08-10T11:55:00Z"), fired_at: null },
    ];
    alertState.shouldFail = false;
    alertState.lockCount = 0;
  });

  describe("GET /api/alerts", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser = null;
      expect((await GET()).status).toBe(401);
    });

    it("returns only the caller's alerts", async () => {
      const response = await GET();
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.data.map((a: MockAlert) => a.id)).toEqual([MY_ALERT_ID]);
    });

    it("returns 500 when the database fails", async () => {
      alertState.shouldFail = true;
      expect((await GET()).status).toBe(500);
    });
  });

  describe("POST /api/alerts", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser = null;
      expect((await post({ event_id: EVENT_ID, offset_minutes: 5 })).status).toBe(401);
    });

    it("creates an event alert that fires offset minutes before the start", async () => {
      const response = await post({ event_id: EVENT_ID, offset_minutes: 60 });
      const json = await response.json();
      expect(response.status).toBe(201);
      expect(json.data).toMatchObject({ user_id: ME, event_id: EVENT_ID, task_id: null, offset_minutes: 60 });
      expect(new Date(json.data.fire_at).toISOString()).toBe("2026-08-10T09:00:00.000Z");
      expect(alertState.rows).toHaveLength(3);
    });

    it("creates a task alert counted back from the due date", async () => {
      const response = await post({ task_id: TASK_ID, offset_minutes: 1440 });
      const json = await response.json();
      expect(response.status).toBe(201);
      expect(json.data).toMatchObject({ user_id: ME, event_id: null, task_id: TASK_ID });
      expect(new Date(json.data.fire_at).toISOString()).toBe("2026-08-14T23:00:00.000Z");
    });

    it("locks the item while it reads the time", async () => {
      await post({ event_id: EVENT_ID, offset_minutes: 5 });
      expect(alertState.lockCount).toBeGreaterThan(0);
    });

    it("returns the existing alert instead of adding a duplicate", async () => {
      const response = await post({ event_id: EVENT_ID, offset_minutes: 15 });
      const json = await response.json();
      expect(response.status).toBe(200);
      expect(json.data.id).toBe(MY_ALERT_ID);
      expect(alertState.rows).toHaveLength(2);
    });

    it("allows several different offsets on one item", async () => {
      expect((await post({ event_id: EVENT_ID, offset_minutes: 5 })).status).toBe(201);
      expect((await post({ event_id: EVENT_ID, offset_minutes: 0 })).status).toBe(201);
      expect(alertState.rows.filter((a) => a.event_id === EVENT_ID)).toHaveLength(3);
    });

    it("returns 404 for another user's event or task and stores nothing", async () => {
      const event = await post({ event_id: OTHER_EVENT_ID, offset_minutes: 5 });
      const task = await post({ task_id: OTHER_TASK_ID, offset_minutes: 5 });
      expect(event.status).toBe(404);
      expect(task.status).toBe(404);
      expect(alertState.rows).toHaveLength(2);
    });

    it("answers a foreign id and a missing id the same way", async () => {
      const foreign = await post({ event_id: OTHER_EVENT_ID, offset_minutes: 5 });
      const missing = await post({ event_id: MISSING_ID, offset_minutes: 5 });
      expect(missing.status).toBe(foreign.status);
      expect(await missing.json()).toEqual(await foreign.json());
    });

    it("returns 400 for a task with no due date", async () => {
      const response = await post({ task_id: UNDATED_TASK_ID, offset_minutes: 5 });
      expect(response.status).toBe(400);
      expect(alertState.rows).toHaveLength(2);
    });

    it.each([
      [{ event_id: EVENT_ID }, "offset_minutes is required"],
      [{ event_id: EVENT_ID, offset_minutes: 10 }, "offset_minutes must be one of 0, 5, 15, 60, 1440"],
      [{ event_id: EVENT_ID, offset_minutes: "5" }, "offset_minutes must be one of 0, 5, 15, 60, 1440"],
      [{ offset_minutes: 5 }, "event_id or task_id is required"],
      [{ event_id: EVENT_ID, task_id: TASK_ID, offset_minutes: 5 }, "Name either event_id or task_id, not both"],
      [{ event_id: "nope", offset_minutes: 5 }, "event_id must be a valid identifier"],
      [{ event_id: EVENT_ID, offset_minutes: 5, user_id: OTHER }, "Unknown field: user_id"],
      [{ event_id: EVENT_ID, offset_minutes: 5, fire_at: "2026-01-01T00:00:00Z" }, "Unknown field: fire_at"],
    ])("rejects %j with 400", async (body, error) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ success: false, error });
      expect(alertState.rows).toHaveLength(2);
    });

    it("returns 400 for invalid JSON", async () => {
      const response = await POST(new Request("http://localhost/api/alerts", { method: "POST", body: "{" }));
      expect(response.status).toBe(400);
    });

    it("returns 500 when the database fails", async () => {
      alertState.shouldFail = true;
      expect((await post({ event_id: EVENT_ID, offset_minutes: 5 })).status).toBe(500);
    });
  });

  describe("DELETE /api/alerts/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      mockCurrentUser = null;
      expect((await del(MY_ALERT_ID)).status).toBe(401);
    });

    it("deletes the caller's alert", async () => {
      const response = await del(MY_ALERT_ID);
      expect(response.status).toBe(200);
      expect(alertState.rows.map((a) => a.id)).toEqual([OTHER_ALERT_ID]);
    });

    it("returns 404 for another user's alert and leaves it in place", async () => {
      const response = await del(OTHER_ALERT_ID);
      expect(response.status).toBe(404);
      expect(alertState.rows.map((a) => a.id)).toContain(OTHER_ALERT_ID);
    });

    it("returns 404 for a missing or malformed id", async () => {
      expect((await del(MISSING_ID)).status).toBe(404);
      expect((await del("not-a-uuid")).status).toBe(404);
      expect(alertState.rows).toHaveLength(2);
    });
  });
});
