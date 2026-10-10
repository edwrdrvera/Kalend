import { describe, expect, it, beforeEach } from "bun:test";
import { setupMockDb, type MockDbState, type MockAuthUser } from "@/test-utils/mock-db";

interface MockEvent {
  id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  user_id: string;
  color?: string;
  color_overridden?: boolean;
  category_id?: string | null;
  location?: string | null;
  icon?: string | null;
  description?: string | null;
  created_at?: Date;
}

let mockCurrentUser: MockAuthUser | null = {
  id: "user-uuid-123",
  email: "student@university.edu",
};

const mockDbState: MockDbState<MockEvent> = {
  rows: [],
  shouldFail: false,
};

const OWNED_CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const MISSING_CATEGORY_ID = "22222222-2222-4222-8222-222222222222";

// Category rows used to test ownership validation.
const mockCategoryRows: { id: string; user_id: string; color: string }[] = [];

interface MockAlert {
  id: string;
  user_id: string;
  event_id: string;
  task_id: null;
  offset_minutes: number;
  fire_at: Date;
  fired_at: Date | null;
}
const mockAlertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };
const alert = (id: string, over: Partial<MockAlert>): MockAlert => ({
  id,
  user_id: "user-uuid-123",
  event_id: "e0000000-0000-4000-8000-000000000001",
  task_id: null,
  offset_minutes: 15,
  fire_at: new Date("2026-08-10T09:45:00Z"),
  fired_at: null,
  ...over,
});

setupMockDb("evt-", mockDbState, () => mockCurrentUser, {}, false, () => mockCategoryRows, {
  alerts: mockAlertState,
});

// Import route handlers after mock setup
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

describe("Events API Endpoints", () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: "user-uuid-123",
      email: "student@university.edu",
    };
    mockDbState.rows = [
      {
        id: "e0000000-0000-4000-8000-000000000001",
        title: "CS 101 Lecture",
        start_at: new Date("2026-08-10T10:00:00Z"),
        end_at: new Date("2026-08-10T11:00:00Z"),
        user_id: "user-uuid-123",
        color: "blue",
        location: "Main Hall",
        icon: "🎓",
      },
      {
        id: "e0000000-0000-4000-8000-000000000002",
        title: "Other User Private Event",
        start_at: new Date("2026-08-10T12:00:00Z"),
        end_at: new Date("2026-08-10T13:00:00Z"),
        user_id: "other-user-456",
        color: "red",
      },
    ];
    mockDbState.shouldFail = false;
    mockAlertState.rows = [];
    mockAlertState.shouldFail = false;
    // The foreign key deletes an event's alerts with it.
    mockDbState.cascadeOn = (deleted) => {
      mockAlertState.rows = mockAlertState.rows.filter((a) => a.event_id !== deleted.id);
    };
    mockDbState.transactionCount = 0;
    mockDbState.lockCount = 0;
    mockCategoryRows.length = 0;
    mockCategoryRows.push({
      id: OWNED_CATEGORY_ID,
      user_id: "user-uuid-123",
      color: "green",
    });
  });

  describe("GET /api/events", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const response = await GET();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 200 with only the authenticated user's events", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].title).toBe("CS 101 Lecture");
      expect(json.data[0].user_id).toBe("user-uuid-123");
      expect(json.data[0].location).toBe("Main Hall");
      expect(json.data[0].icon).toBe("🎓");
    });

    it("returns 500 when database throws an error", async () => {
      mockDbState.shouldFail = true;
      const response = await GET();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal Server Error");
    });
  });

  describe("POST /api/events", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Math Lecture",
          start_at: "2026-08-11T10:00:00Z",
          end_at: "2026-08-11T11:00:00Z",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 for malformed JSON without inserting an event", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"title":',
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for non-object JSON without inserting an event", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const body of ["null", "[]", '\"Event\"', "42"]) {
        const response = await POST(new Request("http://localhost/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }));

        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("Request body must be an object");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 when required fields are missing", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Incomplete Event" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("title, start_at, and end_at are required");
    });

    it("returns 400 when title is blank", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "   ",
          start_at: "2026-08-11T10:00:00Z",
          end_at: "2026-08-11T11:00:00Z",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("title, start_at, and end_at are required");
    });

    it("returns 400 when dates are invalid", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Math Homework",
          start_at: "invalid-date",
          end_at: "not-a-date",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("start_at and end_at must be valid dates");
    });

    it("returns 400 when start_at is not before end_at", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Impossible Event",
          start_at: "2026-08-11T03:00:00Z",
          end_at: "2026-08-11T03:00:00Z",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("start_at must be before end_at");
    });

    it("returns 400 when color is outside the supported palette", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Math Lecture",
          start_at: "2026-08-11T10:00:00Z",
          end_at: "2026-08-11T11:00:00Z",
          color: "chartreuse",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("color must be a supported color");
    });

    it("returns 201 with created event and binds user_id from session", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          color: "purple",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Physics Lab");
      expect(json.data.user_id).toBe("user-uuid-123");
      expect(json.data.color).toBe("purple");
    });

    it("returns 500 when database insert fails", async () => {
      mockDbState.shouldFail = true;
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Chemistry Study",
          start_at: "2026-08-12T09:00:00Z",
          end_at: "2026-08-12T10:00:00Z",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal Server Error");
    });

    it("links the event to a category when category_id is given", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          category_id: OWNED_CATEGORY_ID,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.category_id).toBe(OWNED_CATEGORY_ID);
    });

    it("rejects a malformed category_id before starting a transaction", async () => {
      const before = mockDbState.rows.map((event) => ({ ...event }));
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          category_id: "category-not-a-uuid",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("Space must be a valid identifier");
      expect(mockDbState.transactionCount).toBe(0);
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns null category_id when none is given", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
        }),
      });

      const response = await POST(req);
      const json = await response.json();
      expect(json.data.category_id).toBeNull();
    });

    it("returns 201 with location and icon when both are given", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          location: "Room 204, Science Building",
          icon: "🧪",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.location).toBe("Room 204, Science Building");
      expect(json.data.icon).toBe("🧪");
    });

    it("returns null location and icon when neither is given", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
        }),
      });

      const response = await POST(req);
      const json = await response.json();
      expect(json.data.location).toBeNull();
      expect(json.data.icon).toBeNull();
    });

    describe("description", () => {
      const post = (description: unknown) =>
        POST(
          new Request("http://localhost/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Physics Lab",
              start_at: "2026-08-11T14:00:00Z",
              end_at: "2026-08-11T16:00:00Z",
              description,
            }),
          })
        );

      it("stores a trimmed description and returns it", async () => {
        const response = await post("  Bring goggles\n");
        expect(response.status).toBe(201);
        expect((await response.json()).data.description).toBe("Bring goggles");
      });

      it("stores whitespace-only and null descriptions as null", async () => {
        for (const description of ["   ", "", null]) {
          const json = await (await post(description)).json();
          expect(json.data.description).toBeNull();
        }
      });

      it("stores null when no description is sent", async () => {
        const response = await POST(
          new Request("http://localhost/api/events", {
            method: "POST",
            body: JSON.stringify({ title: "Lab", start_at: "2026-08-11T14:00:00Z", end_at: "2026-08-11T16:00:00Z" }),
          })
        );
        expect((await response.json()).data.description).toBeNull();
      });

      it("rejects a description over the limit without inserting", async () => {
        const before = mockDbState.rows.length;
        const response = await post("x".repeat(2001));
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("description must be at most 2000 characters");
        expect(mockDbState.rows.length).toBe(before);
      });

      it("accepts exactly the limit", async () => {
        expect((await post("x".repeat(2000))).status).toBe(201);
      });

      it("rejects a non-string description", async () => {
        const response = await post(42);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("description must be a string");
      });

      it("returns a saved description from GET", async () => {
        mockDbState.rows[0].description = "Room code 4821";
        const json = await (await GET()).json();
        expect(json.data[0].description).toBe("Room code 4821");
      });
    });

    it("returns 400 when location is not a string", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          location: 42,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("location must be a string of at most 500 characters");
    });

    it("returns 400 when location exceeds the max length", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          location: "x".repeat(501),
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("location must be a string of at most 500 characters");
    });

    it("returns 400 when icon is not a string", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          icon: 42,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("icon must be a string of at most 10 characters");
    });

    it("returns 400 when icon exceeds the max length", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Physics Lab",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          icon: "x".repeat(11),
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("icon must be a string of at most 10 characters");
    });
  });

  describe("PATCH /api/events/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(401);
    });

    it("returns 400 for malformed JSON without updating an event", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const response = await PATCH(new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: '{"title":',
      }), { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for an empty or whitespace title without updating the event", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const title of ["", "   "]) {
        const response = await PATCH(new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }), { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ success: false, error: "title is required" });
      }
      expect(mockDbState.rows).toEqual(before);
    });

    it("trims the title on update", async () => {
      const response = await PATCH(new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  Renamed  " }),
      }), { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });

      expect(response.status).toBe(200);
      expect((await response.json()).data.title).toBe("Renamed");
    });

    it("returns 400 for non-object JSON without updating an event", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const body of ["null", "[]", '\"Updated\"', "42"]) {
        const response = await PATCH(new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }), { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });

        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("Request body must be an object");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 when no updatable fields are provided", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("No updatable fields provided");
    });

    it("returns 400 when an updated color is outside the supported palette", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: "chartreuse" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("color must be a supported color");
    });

    it("returns 400 when start_at date is invalid", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: "bad-start-date" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("start_at must be a valid date");
    });

    it("returns 400 when end_at date is invalid", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_at: "bad-end-date" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("end_at must be a valid date");
    });

    it("returns 400 when start_at is not before end_at", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: "2026-08-11T03:00:00Z",
          end_at: "2026-08-11T03:00:00Z",
        }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("start_at must be before end_at");
    });

    it("allows a valid partial start_at update after comparing with the locked row", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: "2026-08-10T09:00:00Z" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);
      expect(mockDbState.transactionCount).toBeGreaterThan(0);
      expect(mockDbState.lockCount).toBeGreaterThan(0);
    });

    it("rejects a partial start_at equal to the existing end without mutation", async () => {
      const original = mockDbState.rows[0].start_at;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ start_at: "2026-08-10T11:00:00Z" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect(mockDbState.rows[0].start_at).toEqual(original);
    });

    it("rejects a partial end_at before the existing start without mutation", async () => {
      const original = mockDbState.rows[0].end_at;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ end_at: "2026-08-10T09:00:00Z" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect(mockDbState.rows[0].end_at).toEqual(original);
    });

    it("rejects non-boolean color_overridden", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ color_overridden: "false" }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("color_overridden must be a boolean");
    });

    it("returns 404 when event id does not exist", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-999999999999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-999999999999" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 404 when attempting to update an event owned by another user", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000002", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000002" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 200 with updated event data when owned by user", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "CS 101 Lecture - Rescheduled",
          color: "green",
        }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("CS 101 Lecture - Rescheduled");
      expect(json.data.color).toBe("green");
    });

    it("sets category_id when given", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: OWNED_CATEGORY_ID }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.category_id).toBe(OWNED_CATEGORY_ID);
    });

    it("rejects a malformed category_id before starting a transaction", async () => {
      const before = mockDbState.rows.map((event) => ({ ...event }));
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: "category-not-a-uuid" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("Space must be a valid identifier");
      expect(mockDbState.transactionCount).toBe(0);
      expect(mockDbState.rows).toEqual(before);
    });

    it("clears category_id when explicitly set to null, falling back to the event's own color", async () => {
      mockDbState.rows[0].category_id = OWNED_CATEGORY_ID;
      mockDbState.rows[0].color = "blue";
      mockDbState.rows[0].color_overridden = false;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.category_id).toBeNull();
      expect(json.data.color).toBe("green");
      expect(json.data.color_overridden).toBe(false);
    });

    it("preserves an explicit override when unlinking a Space", async () => {
      mockDbState.rows[0].category_id = OWNED_CATEGORY_ID;
      mockDbState.rows[0].color = "purple";
      mockDbState.rows[0].color_overridden = true;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ category_id: null }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      const json = await response.json();
      expect(json.data.color).toBe("purple");
      expect(json.data.color_overridden).toBe(true);
    });

    it("sets location and icon when given", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: "Library, Room 3", icon: "📚" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.location).toBe("Library, Room 3");
      expect(json.data.icon).toBe("📚");
    });

    it("clears location and icon when explicitly set to null", async () => {
      mockDbState.rows[0].location = "Old Room";
      mockDbState.rows[0].icon = "📖";
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: null, icon: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.location).toBeNull();
      expect(json.data.icon).toBeNull();
    });

    describe("description", () => {
      const patch = (id: string, body: unknown) =>
        PATCH(
          new Request(`http://localhost/api/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
          { params: Promise.resolve({ id }) }
        );

      it("sets a trimmed description", async () => {
        const response = await patch("e0000000-0000-4000-8000-000000000001", { description: "  Bring ID " });
        expect(response.status).toBe(200);
        expect((await response.json()).data.description).toBe("Bring ID");
      });

      it("clears the description with null or blank text", async () => {
        mockDbState.rows[0].description = "Old note";
        expect((await (await patch("e0000000-0000-4000-8000-000000000001", { description: null })).json()).data.description).toBeNull();
        mockDbState.rows[0].description = "Old note";
        expect((await (await patch("e0000000-0000-4000-8000-000000000001", { description: "   " })).json()).data.description).toBeNull();
      });

      it("leaves the description alone when omitted", async () => {
        mockDbState.rows[0].description = "Keep me";
        const response = await patch("e0000000-0000-4000-8000-000000000001", { title: "Renamed" });
        expect((await response.json()).data.description).toBe("Keep me");
      });

      it("rejects an over-long description and keeps the stored one", async () => {
        mockDbState.rows[0].description = "Keep me";
        const response = await patch("e0000000-0000-4000-8000-000000000001", { description: "x".repeat(2001) });
        expect(response.status).toBe(400);
        expect(mockDbState.rows[0].description).toBe("Keep me");
      });

      it("returns 404 for another user's event and leaves its description untouched", async () => {
        mockDbState.rows[1].description = "Private";
        const response = await patch("e0000000-0000-4000-8000-000000000002", { description: "Hacked" });
        expect(response.status).toBe(404);
        expect(mockDbState.rows[1].description).toBe("Private");
      });
    });

    it("leaves location and icon unchanged when omitted", async () => {
      mockDbState.rows[0].location = "Existing Room";
      mockDbState.rows[0].icon = "🎓";
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "CS 101 Lecture - Moved" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.location).toBe("Existing Room");
      expect(json.data.icon).toBe("🎓");
    });

    it("returns 400 when an updated location is not a string", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ location: 42 }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("location must be a string of at most 500 characters");
    });

    it("returns 400 when an updated location exceeds the max length", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ location: "x".repeat(501) }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("location must be a string of at most 500 characters");
    });

    it("returns 400 when an updated icon is not a string", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ icon: 42 }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("icon must be a string of at most 10 characters");
    });

    it("returns 400 when an updated icon exceeds the max length", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        body: JSON.stringify({ icon: "x".repeat(11) }),
      });
      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("icon must be a string of at most 10 characters");
    });
  });

  describe("category ownership validation", () => {
    it("POST returns 400 when category_id belongs to another user", async () => {
      // Replace with a category owned by a different user.
      mockCategoryRows.length = 0;
      mockCategoryRows.push({ id: OWNED_CATEGORY_ID, user_id: "other-user-456", color: "red" });

      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Stolen category event",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          category_id: OWNED_CATEGORY_ID,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(
        "The selected Space is unavailable"
      );
    });

    it("POST returns 400 when category_id does not exist", async () => {
      const req = new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Ghost category event",
          start_at: "2026-08-11T14:00:00Z",
          end_at: "2026-08-11T16:00:00Z",
          category_id: MISSING_CATEGORY_ID,
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(
        "The selected Space is unavailable"
      );
    });

    it("PATCH returns 400 when category_id belongs to another user", async () => {
      mockCategoryRows.length = 0;
      mockCategoryRows.push({ id: OWNED_CATEGORY_ID, user_id: "other-user-456", color: "red" });

      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: OWNED_CATEGORY_ID }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(
        "The selected Space is unavailable"
      );
    });

    it("PATCH succeeds when clearing category_id with null (no ownership check needed)", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);
      expect((await response.json()).data.category_id).toBeNull();
    });
  });

  describe("DELETE /api/events/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(401);
    });

    it("returns 404 when event id does not exist", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-999999999999", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-999999999999" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 404 when attempting to delete an event owned by another user", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000002", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000002" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 200 with deleted event data on success", async () => {
      const req = new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("e0000000-0000-4000-8000-000000000001");
    });

    it("removes the event's alerts and leaves everyone else's", async () => {
      mockAlertState.rows = [
        alert("alert-mine", { event_id: "e0000000-0000-4000-8000-000000000001" }),
        alert("alert-theirs", { user_id: "other-user-456", event_id: "e0000000-0000-4000-8000-000000000002" }),
      ];
      const response = await DELETE(
        new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", { method: "DELETE" }),
        { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) }
      );
      expect(response.status).toBe(200);
      expect(mockAlertState.rows.map((a) => a.id)).toEqual(["alert-theirs"]);
    });
  });

  describe("alerts follow a moved event", () => {
    const patchStart = (id: string, start_at: string) =>
      PATCH(
        new Request(`http://localhost/api/events/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            start_at,
            end_at: new Date(new Date(start_at).getTime() + 3_600_000).toISOString(),
          }),
        }),
        { params: Promise.resolve({ id }) }
      );
    const stored = (id: string) => mockAlertState.rows.find((a) => a.id === id)!;

    beforeEach(() => {
      mockAlertState.rows = [
        alert("alert-hour", { event_id: "e0000000-0000-4000-8000-000000000001", offset_minutes: 60 }),
        alert("alert-start", { event_id: "e0000000-0000-4000-8000-000000000001", offset_minutes: 0 }),
        alert("alert-theirs", { user_id: "other-user-456", event_id: "e0000000-0000-4000-8000-000000000002" }),
      ];
    });

    it("moves each alert by its own offset", async () => {
      const response = await patchStart("e0000000-0000-4000-8000-000000000001", "2099-08-20T10:00:00Z");
      expect(response.status).toBe(200);
      expect(stored("alert-hour").fire_at.toISOString()).toBe("2099-08-20T09:00:00.000Z");
      expect(stored("alert-start").fire_at.toISOString()).toBe("2099-08-20T10:00:00.000Z");
    });

    it("lets a fired alert fire again once it lands in the future", async () => {
      stored("alert-hour").fired_at = new Date("2026-08-10T09:00:00Z");
      await patchStart("e0000000-0000-4000-8000-000000000001", "2099-08-20T10:00:00Z");
      expect(stored("alert-hour").fired_at).toBeNull();
    });

    it("keeps an alert fired when the event moves to a time already past", async () => {
      const firedAt = new Date("2026-08-10T09:00:00Z");
      stored("alert-hour").fired_at = firedAt;
      await patchStart("e0000000-0000-4000-8000-000000000001", "2020-01-01T10:00:00Z");
      expect(stored("alert-hour").fired_at).toEqual(firedAt);
      expect(stored("alert-hour").fire_at.toISOString()).toBe("2020-01-01T09:00:00.000Z");
    });

    it("leaves other users' alerts alone", async () => {
      const before = stored("alert-theirs").fire_at.toISOString();
      await patchStart("e0000000-0000-4000-8000-000000000001", "2099-08-20T10:00:00Z");
      expect(stored("alert-theirs").fire_at.toISOString()).toBe(before);
    });

    it("does not touch alerts when the start did not change", async () => {
      const before = stored("alert-hour").fire_at.toISOString();
      const response = await PATCH(
        new Request("http://localhost/api/events/e0000000-0000-4000-8000-000000000001", {
          method: "PATCH",
          body: JSON.stringify({ title: "Renamed", start_at: "2026-08-10T10:00:00Z" }),
        }),
        { params: Promise.resolve({ id: "e0000000-0000-4000-8000-000000000001" }) }
      );
      expect(response.status).toBe(200);
      expect(stored("alert-hour").fire_at.toISOString()).toBe(before);
    });

    it("rolls the event move back when the alerts cannot be updated", async () => {
      mockAlertState.shouldFail = true;
      const response = await patchStart("e0000000-0000-4000-8000-000000000001", "2099-08-20T10:00:00Z");
      expect(response.status).toBe(500);
      expect(mockDbState.rows.find((e) => e.id === "e0000000-0000-4000-8000-000000000001")?.start_at.toISOString()).toBe(
        "2026-08-10T10:00:00.000Z"
      );
    });
  });
});
