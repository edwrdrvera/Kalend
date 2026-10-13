import { beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";
import {
  ICS_FILE_REQUIRED_MESSAGE,
  ICS_NOT_CALENDAR_MESSAGE,
  ICS_TIME_ZONE_MESSAGE,
  ICS_TOO_LARGE_MESSAGE,
  ICS_TOO_MANY_MESSAGE,
  MAX_ICS_BYTES,
} from "@/lib/ics-limits";

interface MockEvent {
  id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  user_id: string;
  color?: string | null;
  color_overridden?: boolean;
  category_id?: string | null;
  group_id?: string | null;
  location?: string | null;
  description?: string | null;
  import_uid?: string | null;
  import_occurrence?: string | null;
}

interface MockAlert {
  id: string;
  user_id: string;
  event_id: string;
  task_id: null;
  offset_minutes: number;
  fire_at: Date;
  fired_at: Date | null;
}

const ME = "user-uuid-123";
const OTHER = "other-user-456";

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };
const mockDbState: MockDbState<MockEvent> = { rows: [], shouldFail: false, evaluateWhere: true };
const mockAlertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };

setupMockDb("evt-", mockDbState, () => mockCurrentUser, {
  color: "blue",
  color_overridden: false,
  category_id: null,
  group_id: null,
  location: null,
  description: null,
  import_uid: null,
  import_occurrence: null,
}, false, () => [], { alerts: mockAlertState });

const { POST } = await import("../import/route");

const fixture = (name: string) =>
  readFileSync(join(import.meta.dir, "../../../../lib/__tests__/fixtures", name), "utf8");

function post(body: string, options?: { tz?: string; contentType?: string; contentLength?: string }) {
  const headers: Record<string, string> = {
    "content-type": options?.contentType ?? "text/calendar",
  };
  if (options?.contentLength) headers["content-length"] = options.contentLength;
  return POST(new Request(`http://localhost/api/events/import?tz=${encodeURIComponent(options?.tz ?? "UTC")}`, {
    method: "POST",
    headers,
    body,
  }));
}

const mine = () => mockDbState.rows.filter((row) => row.user_id === ME);
const snapshot = () => mockDbState.rows.map((row) => ({ ...row }));

describe("POST /api/events/import", () => {
  beforeEach(() => {
    mockCurrentUser = { id: ME, email: "student@university.edu" };
    mockDbState.rows = [
      {
        id: "hand-typed",
        title: "Typed by hand",
        start_at: new Date("2026-10-13T12:00:00.000Z"),
        end_at: new Date("2026-10-13T13:00:00.000Z"),
        user_id: ME,
        import_uid: null,
        import_occurrence: null,
      },
      {
        id: "other-secret",
        title: "Secret",
        start_at: new Date("2026-10-13T15:00:00.000Z"),
        end_at: new Date("2026-10-13T16:15:00.000Z"),
        user_id: OTHER,
        import_uid: "canvas-cs101@instructure.com",
        import_occurrence: "",
        color: "red",
      },
    ];
    mockDbState.shouldFail = false;
    mockDbState.transactionCount = 0;
    mockDbState.insertCalls = 0;
    mockAlertState.rows = [];
    mockAlertState.shouldFail = false;
  });

  it("returns 401 when nobody is signed in and writes nothing", async () => {
    mockCurrentUser = null;
    const before = snapshot();
    const response = await post(fixture("canvas.ics"));
    expect(response.status).toBe(401);
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });

  it("stores a Canvas export and a Google export at the file's times", async () => {
    const canvas = await post(fixture("canvas.ics"));
    expect(canvas.status).toBe(200);
    const canvasBody = await canvas.json();
    expect(canvasBody.data.imported).toBe(2);
    const lecture = mine().find((row) => row.import_uid === "canvas-cs101@instructure.com");
    expect(lecture).toMatchObject({
      title: "CS 101 Lecture",
      start_at: new Date("2026-10-13T15:00:00.000Z"),
      end_at: new Date("2026-10-13T16:15:00.000Z"),
      user_id: ME,
      category_id: null,
      color: "blue",
    });

    const google = await post(fixture("google.ics"));
    expect(google.status).toBe(200);
    const review = mine().find((row) => row.import_uid === "design-review@google.com");
    const after = mine().find((row) => row.import_uid === "after-fallback@google.com");
    expect(review?.start_at.toISOString()).toBe("2026-10-13T16:00:00.000Z");
    expect(after?.start_at.toISOString()).toBe("2026-11-01T18:30:00.000Z");
  });

  it("stores an all-day event as local midnight through the next local midnight", async () => {
    const response = await post(fixture("all-day.ics"), { tz: "America/Chicago" });
    expect(response.status).toBe(200);
    const fall = mine().find((row) => row.import_uid === "fall-break@school");
    expect(fall?.start_at.toISOString()).toBe("2026-10-15T05:00:00.000Z");
    expect(fall?.end_at.toISOString()).toBe("2026-10-16T05:00:00.000Z");
  });

  it("stores a weekly event for six months without its skipped dates, and a second import adds nothing", async () => {
    const first = await post(fixture("weekly-exdate.ics"));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const studio = () => mine().filter((row) => row.import_uid === "studio@school");
    expect(studio().some((row) => row.start_at.toISOString() === "2026-10-20T15:00:00.000Z")).toBe(false);
    expect(studio()).toHaveLength(firstBody.data.imported);
    expect(firstBody.data.imported).toBeGreaterThan(20);

    const before = studio().length;
    const second = await post(fixture("weekly-exdate.ics"));
    const secondBody = await second.json();
    expect(secondBody.data).toMatchObject({ imported: 0, updated: 0, unchanged: before });
    expect(studio()).toHaveLength(before);
    expect(new Set(studio().map((row) => row.import_occurrence)).size).toBe(before);
  });

  it("leaves another user's event and a hand-typed event alone", async () => {
    await post(fixture("canvas.ics"));
    const secret = mockDbState.rows.find((row) => row.id === "other-secret");
    const typed = mockDbState.rows.find((row) => row.id === "hand-typed");
    expect(secret).toMatchObject({ title: "Secret", user_id: OTHER });
    expect(typed).toMatchObject({ title: "Typed by hand", import_uid: null });
    expect(mine().every((row) => row.user_id === ME)).toBe(true);
  });

  it("leaves an existing event as it is and adds only the new ones", async () => {
    mockDbState.rows.push({
      id: "already",
      title: "Old title",
      start_at: new Date("2026-01-01T10:00:00.000Z"),
      end_at: new Date("2026-01-01T11:00:00.000Z"),
      user_id: ME,
      import_uid: "canvas-cs101@instructure.com",
      import_occurrence: "",
      color: "red",
      color_overridden: true,
      category_id: "space-1",
      group_id: null,
      location: "Room the student picked",
      description: "Notes the student wrote",
    });
    const response = await post(fixture("canvas.ics"));
    const body = await response.json();
    expect(body.data).toMatchObject({ imported: 1, updated: 0, unchanged: 1 });
    const row = mockDbState.rows.find((event) => event.id === "already");
    expect(row).toMatchObject({
      title: "Old title",
      start_at: new Date("2026-01-01T10:00:00.000Z"),
      end_at: new Date("2026-01-01T11:00:00.000Z"),
      location: "Room the student picked",
      description: "Notes the student wrote",
      color: "red",
      category_id: "space-1",
      user_id: ME,
    });
    expect(mine().some((event) => event.import_uid === "canvas-office@instructure.com")).toBe(true);
  });

  it("keeps an occurrence the new file dropped and leaves the alert where it is", async () => {
    const original = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20270601T150000Z
DTEND:20270601T160000Z
SUMMARY:Seminar
UID:seminar@school
END:VEVENT
BEGIN:VEVENT
DTSTART:20270603T150000Z
DTEND:20270603T160000Z
SUMMARY:Dropped later
UID:dropped@school
END:VEVENT
END:VCALENDAR`;
    await post(original);
    const event = mine().find((row) => row.import_uid === "seminar@school");
    mockAlertState.rows.push({
      id: "alert-1",
      user_id: ME,
      event_id: event!.id,
      task_id: null,
      offset_minutes: 15,
      fire_at: new Date("2027-06-01T14:45:00.000Z"),
      fired_at: new Date("2027-05-01T00:00:00.000Z"),
    });
    mockAlertState.rows.push({
      id: "alert-other",
      user_id: OTHER,
      event_id: event!.id,
      task_id: null,
      offset_minutes: 15,
      fire_at: new Date("2027-06-01T14:45:00.000Z"),
      fired_at: null,
    });

    const again = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20270601T170000Z
DTEND:20270601T180000Z
SUMMARY:Seminar moved
LOCATION:Lab 4
DESCRIPTION:Bring notes
UID:seminar@school
END:VEVENT
BEGIN:VEVENT
DTSTART:20270602T150000Z
DTEND:20270602T160000Z
SUMMARY:Added later
UID:added@school
END:VEVENT
END:VCALENDAR`;
    const response = await post(again);
    expect((await response.json()).data).toMatchObject({ imported: 1, updated: 0, unchanged: 1 });
    const kept = mine().find((row) => row.import_uid === "seminar@school");
    expect(kept).toMatchObject({
      title: "Seminar",
      start_at: new Date("2027-06-01T15:00:00.000Z"),
      end_at: new Date("2027-06-01T16:00:00.000Z"),
      location: null,
      description: null,
    });
    const dropped = mine().find((row) => row.import_uid === "dropped@school");
    expect(dropped).toMatchObject({ title: "Dropped later" });
    expect(mine().some((row) => row.import_uid === "added@school" && row.title === "Added later")).toBe(true);
    const own = mockAlertState.rows.find((alert) => alert.id === "alert-1");
    const other = mockAlertState.rows.find((alert) => alert.id === "alert-other");
    expect(own?.fire_at.toISOString()).toBe("2027-06-01T14:45:00.000Z");
    expect(own?.fired_at).toEqual(new Date("2027-05-01T00:00:00.000Z"));
    expect(other?.fire_at.toISOString()).toBe("2027-06-01T14:45:00.000Z");
  });

  it("writes nothing when the file is not a calendar", async () => {
    const before = snapshot();
    const response = await post(fixture("not-a-calendar.txt"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: ICS_NOT_CALENDAR_MESSAGE });
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });

  it("writes nothing when the time zone is not valid", async () => {
    const before = snapshot();
    const response = await post(fixture("canvas.ics"), { tz: "Not/AZone" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(ICS_TIME_ZONE_MESSAGE);
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });

  it("writes nothing when the body is not a calendar file", async () => {
    const before = snapshot();
    const response = await post(fixture("canvas.ics"), { contentType: "application/json" });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(ICS_FILE_REQUIRED_MESSAGE);
    expect(mockDbState.rows).toEqual(before);
  });

  it("imports one copy when two imports of the same new event run together", async () => {
    const [first, second] = await Promise.all([post(fixture("canvas.ics")), post(fixture("canvas.ics"))]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const lectures = mine().filter((row) => row.import_uid === "canvas-cs101@instructure.com");
    const hours = mine().filter((row) => row.import_uid === "canvas-office@instructure.com");
    expect(lectures).toHaveLength(1);
    expect(hours).toHaveLength(1);
    expect(lectures[0]?.user_id).toBe(ME);
    expect(mockDbState.rows.find((row) => row.id === "other-secret")?.title).toBe("Secret");
    expect(mockDbState.rows.find((row) => row.id === "hand-typed")?.import_uid).toBeNull();
    const bodies = [await first.json(), await second.json()];
    const imported = bodies.reduce((sum, body) => sum + body.data.imported, 0);
    const updated = bodies.reduce((sum, body) => sum + body.data.updated, 0);
    expect(imported).toBe(2);
    expect(updated).toBe(0);
    // Both requests missed the new rows on the read, so both tried to insert.
    expect(mockDbState.insertCalls).toBe(2);
  });

  it("writes nothing when the file is larger than the limit", async () => {
    const before = snapshot();
    const byHeader = await post(fixture("canvas.ics"), { contentLength: String(MAX_ICS_BYTES + 1) });
    expect(byHeader.status).toBe(413);
    expect((await byHeader.json()).error).toBe(ICS_TOO_LARGE_MESSAGE);

    const byBody = await post("BEGIN:VCALENDAR\n" + "X".repeat(MAX_ICS_BYTES));
    expect(byBody.status).toBe(413);
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });

  it("stops reading a chunked file once it passes the size limit", async () => {
    const chunk = 64 * 1024;
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads += 1;
        // Close well past the cap so a reader that ignores the cap would keep going.
        if (reads > 40) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(chunk));
      },
    });
    const before = snapshot();
    const init = {
      method: "POST",
      headers: { "content-type": "text/calendar" },
      body: stream,
      duplex: "half",
    };
    const response = await POST(new Request("http://localhost/api/events/import?tz=UTC", init));
    expect(response.status).toBe(413);
    expect((await response.json()).error).toBe(ICS_TOO_LARGE_MESSAGE);
    // 32 chunks fill the cap. One more crosses it. A reader of the whole stream would pass 40.
    expect(reads).toBeLessThanOrEqual(34);
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });

  it("writes nothing when expansion would pass the event cap", async () => {
    const before = snapshot();
    const response = await post(fixture("hourly.ics"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(ICS_TOO_MANY_MESSAGE);
    expect(mockDbState.rows).toEqual(before);
    expect(mockDbState.transactionCount).toBe(0);
  });
});
