import { afterEach, describe, expect, it, beforeEach, setSystemTime } from "bun:test";
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
}

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_EVENT_ID = "11111111-1111-4111-8111-222222222222";
const TASK_ID = "33333333-3333-4333-8333-111111111111";
const NOW = new Date("2026-08-10T10:00:00Z");
const minutesFromNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };

const alertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };
const eventState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };
const taskState: MockDbState<MockItem> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("alert-", alertState, () => mockCurrentUser, {}, false, () => [], {
  events: eventState,
  tasks: taskState,
});

import { POST } from "../claim/route";

const claim = () => POST(new Request("http://localhost/api/alerts/claim", { method: "POST" }));
const alertRow = (id: string, over: Partial<MockAlert>): MockAlert => ({
  id,
  user_id: ME,
  event_id: EVENT_ID,
  task_id: null,
  offset_minutes: 15,
  fire_at: minutesFromNow(0),
  fired_at: null,
  ...over,
});
const firedAt = (id: string) => alertState.rows.find((a) => a.id === id)?.fired_at;

describe("POST /api/alerts/claim", () => {
  beforeEach(() => {
    setSystemTime(NOW);
    mockCurrentUser = { id: ME, email: "student@university.edu" };
    eventState.rows = [
      { id: EVENT_ID, user_id: ME, title: "CS 101 Lecture" },
      { id: OTHER_EVENT_ID, user_id: OTHER, title: "Private" },
    ];
    taskState.rows = [{ id: TASK_ID, user_id: ME, title: "Essay" }];
    alertState.rows = [];
    alertState.shouldFail = false;
    eventState.shouldFail = false;
  });

  afterEach(() => setSystemTime());

  it("returns 401 when unauthenticated", async () => {
    mockCurrentUser = null;
    expect((await claim()).status).toBe(401);
  });

  it("returns empty lists when nothing is due", async () => {
    alertState.rows = [alertRow("a-future", { fire_at: minutesFromNow(30) })];
    const json = await (await claim()).json();
    expect(json).toEqual({ success: true, data: { due: [], missed: [] } });
    expect(firedAt("a-future")).toBeNull();
  });

  it("hands out a due alert with its item and marks it fired", async () => {
    alertState.rows = [alertRow("a-due", { fire_at: minutesFromNow(-1) })];
    const json = await (await claim()).json();
    expect(json.data.missed).toEqual([]);
    expect(json.data.due).toEqual([
      {
        id: "a-due",
        kind: "event",
        item_id: EVENT_ID,
        title: "CS 101 Lecture",
        offset_minutes: 15,
        fire_at: minutesFromNow(-1).toISOString(),
      },
    ]);
    expect(firedAt("a-due")?.toISOString()).toBe(NOW.toISOString());
  });

  it("hands out each alert once across repeated and concurrent claims", async () => {
    alertState.rows = [alertRow("a-due", { fire_at: minutesFromNow(-1) })];
    const [first, second] = await Promise.all([claim(), claim()]);
    const results = [await first.json(), await second.json()];
    const delivered = results.flatMap((r) => [...r.data.due, ...r.data.missed]);
    expect(delivered.map((a: { id: string }) => a.id)).toEqual(["a-due"]);
    const again = await (await claim()).json();
    expect(again.data).toEqual({ due: [], missed: [] });
  });

  it("does not hand out an alert that already fired", async () => {
    alertState.rows = [alertRow("a-done", { fire_at: minutesFromNow(-1), fired_at: minutesFromNow(-1) })];
    const json = await (await claim()).json();
    expect(json.data).toEqual({ due: [], missed: [] });
  });

  it("splits alerts by how late the claim is", async () => {
    alertState.rows = [
      alertRow("a-fresh", { offset_minutes: 5, fire_at: minutesFromNow(-4) }),
      alertRow("a-edge", { offset_minutes: 0, fire_at: minutesFromNow(-5) }),
      alertRow("a-late", { offset_minutes: 60, fire_at: minutesFromNow(-6) }),
      alertRow("a-days", { offset_minutes: 1440, task_id: TASK_ID, event_id: null, fire_at: minutesFromNow(-3000) }),
    ];
    const { data } = await (await claim()).json();
    expect(data.due.map((a: { id: string }) => a.id)).toEqual(["a-edge", "a-fresh"]);
    expect(data.missed.map((a: { id: string }) => a.id)).toEqual(["a-days", "a-late"]);
    expect(data.missed[0]).toMatchObject({ kind: "task", item_id: TASK_ID, title: "Essay" });
  });

  it("never claims or reveals another user's alerts", async () => {
    alertState.rows = [
      alertRow("a-mine", { fire_at: minutesFromNow(-1) }),
      alertRow("a-theirs", { user_id: OTHER, event_id: OTHER_EVENT_ID, fire_at: minutesFromNow(-1) }),
    ];
    const json = await (await claim()).json();
    expect(json.data.due.map((a: { id: string }) => a.id)).toEqual(["a-mine"]);
    expect(firedAt("a-theirs")).toBeNull();
  });

  it("does not take a title from another user's item", async () => {
    alertState.rows = [alertRow("a-stray", { event_id: OTHER_EVENT_ID, fire_at: minutesFromNow(-1) })];
    const json = await (await claim()).json();
    expect(JSON.stringify(json)).not.toContain("Private");
    expect(json.data).toEqual({ due: [], missed: [] });
  });

  it("un-claims the alerts when the item lookup fails, so none are lost", async () => {
    alertState.rows = [alertRow("a-due", { fire_at: minutesFromNow(-1) })];
    eventState.shouldFail = true;
    expect((await claim()).status).toBe(500);
    eventState.shouldFail = false;
    expect(firedAt("a-due")).toBeNull();
    const retry = await (await claim()).json();
    expect(retry.data.due.map((a: { id: string }) => a.id)).toEqual(["a-due"]);
  });
});
