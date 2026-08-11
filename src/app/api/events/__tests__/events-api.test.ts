import { describe, expect, it, mock, beforeEach } from "bun:test";

interface MockEvent {
  id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  user_id: string;
  color?: string;
  created_at?: Date;
}

let mockCurrentUser: { id: string; email: string } | null = {
  id: "user-uuid-123",
  email: "student@university.edu",
};

const mockDbState = {
  events: [] as MockEvent[],
  shouldFail: false,
};

function extractIdFromCondition(condition: unknown): string | null {
  if (!condition) return null;
  if (typeof condition === "string") return condition;

  const seen = new Set<unknown>();
  const queue: unknown[] = [condition];
  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr || typeof curr !== "object" || seen.has(curr)) continue;
    seen.add(curr);

    const record = curr as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === "string") {
        if (val.startsWith("evt-") || val.includes("existent")) return val;
      } else if (val && typeof val === "object") {
        queue.push(val);
      }
    }
  }

  return null;
}

mock.module("@/lib/supabase/auth-user", () => ({
  getAuthenticatedUser: mock(async () => mockCurrentUser),
}));

mock.module("@/db", () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: mock(async () => {
            if (mockDbState.shouldFail) throw new Error("DB Connection failed");
            if (!mockCurrentUser) return [];
            return mockDbState.events.filter((e) => e.user_id === mockCurrentUser!.id);
          }),
        }),
      }),
      insert: () => ({
        values: (vals: Record<string, unknown>) => ({
          returning: mock(async () => {
            if (mockDbState.shouldFail) throw new Error("DB Insert failed");
            const row = { id: "evt-uuid-1", created_at: new Date(), ...vals } as MockEvent;
            mockDbState.events.push(row);
            return [row];
          }),
        }),
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: (condition: unknown) => ({
            returning: mock(async () => {
              if (mockDbState.shouldFail) throw new Error("DB Update failed");
              const targetId = extractIdFromCondition(condition);
              const idx = mockDbState.events.findIndex(
                (e) => e.id === targetId && (!mockCurrentUser || e.user_id === mockCurrentUser.id)
              );
              if (idx === -1) return [];
              const updated = { ...mockDbState.events[idx], ...vals };
              mockDbState.events[idx] = updated;
              return [updated];
            }),
          }),
        }),
      }),
      delete: () => ({
        where: (condition: unknown) => ({
          returning: mock(async () => {
            if (mockDbState.shouldFail) throw new Error("DB Delete failed");
            const targetId = extractIdFromCondition(condition);
            const idx = mockDbState.events.findIndex(
              (e) => e.id === targetId && (!mockCurrentUser || e.user_id === mockCurrentUser.id)
            );
            if (idx === -1) return [];
            const [deleted] = mockDbState.events.splice(idx, 1);
            return [deleted];
          }),
        }),
      }),
    },
  };
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
    mockDbState.events = [
      {
        id: "evt-uuid-1",
        title: "CS 101 Lecture",
        start_at: new Date("2026-08-10T10:00:00Z"),
        end_at: new Date("2026-08-10T11:00:00Z"),
        user_id: "user-uuid-123",
        color: "blue",
      },
      {
        id: "evt-uuid-other",
        title: "Other User Private Event",
        start_at: new Date("2026-08-10T12:00:00Z"),
        end_at: new Date("2026-08-10T13:00:00Z"),
        user_id: "other-user-456",
        color: "red",
      },
    ];
    mockDbState.shouldFail = false;
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
  });

  describe("PATCH /api/events/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 400 when no updatable fields are provided", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("No updatable fields provided");
    });

    it("returns 400 when start_at date is invalid", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: "bad-start-date" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("start_at must be a valid date");
    });

    it("returns 400 when end_at date is invalid", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ end_at: "bad-end-date" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("end_at must be a valid date");
    });

    it("returns 404 when event id does not exist", async () => {
      const req = new Request("http://localhost/api/events/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 404 when attempting to update an event owned by another user", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-other", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 200 with updated event data when owned by user", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "CS 101 Lecture - Rescheduled",
          color: "green",
        }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("CS 101 Lecture - Rescheduled");
      expect(json.data.color).toBe("green");
    });
  });

  describe("DELETE /api/events/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 404 when event id does not exist", async () => {
      const req = new Request("http://localhost/api/events/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 404 when attempting to delete an event owned by another user", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-other", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "evt-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Event not found");
    });

    it("returns 200 with deleted event data on success", async () => {
      const req = new Request("http://localhost/api/events/evt-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "evt-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("evt-uuid-1");
    });
  });
});
