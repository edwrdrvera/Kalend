import { describe, expect, it, beforeEach } from "bun:test";
import { setupMockDb, type MockDbState, type MockAuthUser } from "@/test-utils/mock-db";

interface MockTask {
  id: string;
  title: string;
  due_at: Date | null;
  completed: boolean;
  user_id: string;
  color?: string;
  color_overridden?: boolean;
  category_id?: string | null;
  created_at?: Date;
}

let mockCurrentUser: MockAuthUser | null = {
  id: "user-uuid-123",
  email: "student@university.edu",
};

const mockDbState: MockDbState<MockTask> = {
  rows: [],
  shouldFail: false,
};

// Category rows used to test ownership validation.
const mockCategoryRows: { id: string; user_id: string; color: string }[] = [];

interface MockAlert {
  id: string;
  user_id: string;
  event_id: null;
  task_id: string;
  offset_minutes: number;
  fire_at: Date;
  fired_at: Date | null;
}
const mockAlertState: MockDbState<MockAlert> = { rows: [], shouldFail: false, evaluateWhere: true };
const alert = (id: string, over: Partial<MockAlert>): MockAlert => ({
  id,
  user_id: "user-uuid-123",
  event_id: null,
  task_id: "task-uuid-1",
  offset_minutes: 15,
  fire_at: new Date("2026-08-15T23:44:00Z"),
  fired_at: null,
  ...over,
});

setupMockDb(
  "task-",
  mockDbState,
  () => mockCurrentUser,
  { completed: false, due_at: null } as Partial<MockTask>,
  false,
  () => mockCategoryRows,
  { alerts: mockAlertState }
);

// Import route handlers after mock setup
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

describe("Tasks API Endpoints", () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: "user-uuid-123",
      email: "student@university.edu",
    };
    mockDbState.rows = [
      {
        id: "task-uuid-1",
        title: "Finish problem set",
        due_at: new Date("2026-08-15T23:59:00Z"),
        completed: false,
        user_id: "user-uuid-123",
        color: "blue",
      },
      {
        id: "task-uuid-other",
        title: "Other User Private Task",
        due_at: null,
        completed: false,
        user_id: "other-user-456",
        color: "red",
      },
    ];
    mockDbState.shouldFail = false;
    mockAlertState.rows = [];
    mockAlertState.shouldFail = false;
    mockCategoryRows.length = 0;
    mockCategoryRows.push({
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-uuid-123",
      color: "green",
    });
  });

  describe("GET /api/tasks", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const response = await GET();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 200 with only the authenticated user's tasks", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].title).toBe("Finish problem set");
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

  describe("POST /api/tasks", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Read chapter 4" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 for malformed JSON without inserting a task", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const response = await POST(new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"title":',
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400, not 500, for wrongly typed fields without inserting a task", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const cases: [string, string][] = [
        ["null", "Request body must be an object"],
        [JSON.stringify({ title: 42 }), "title must be a string"],
        [JSON.stringify({ title: "Read", category_id: "not-a-uuid" }), "Space must be a valid identifier"],
        [JSON.stringify({ title: "Read", color_overridden: "yes" }), "color_overridden must be a boolean"],
      ];
      for (const [body, error] of cases) {
        const response = await POST(new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }));
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ success: false, error });
      }
      expect(mockDbState.rows).toEqual(before);
    });

    it("stores the title trimmed", async () => {
      const response = await POST(new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  Read chapter 4  " }),
      }));
      expect(response.status).toBe(201);
      expect((await response.json()).data.title).toBe("Read chapter 4");
    });

    it("returns 400 when title is missing", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_at: "2026-08-20T10:00:00Z" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("title is required");
    });

    it("returns 400 when title is blank", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("title is required");
    });

    it("returns 400 when due_at is invalid", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Study for midterm", due_at: "not-a-date" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("due_at must be a valid date");
    });

    it("returns 400 when color is outside the supported palette", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Read chapter 4", color: "chartreuse" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("color must be a supported color");
    });

    it("returns 201 with a created task and no due date when due_at is omitted", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Brain dump this thought" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Brain dump this thought");
      expect(json.data.user_id).toBe("user-uuid-123");
      expect(json.data.due_at).toBeNull();
    });

    it("returns 201 with created task and binds user_id from session", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Submit essay",
          due_at: "2026-08-20T17:00:00Z",
          color: "purple",
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Submit essay");
      expect(json.data.user_id).toBe("user-uuid-123");
      expect(json.data.color).toBe("purple");
    });

    it("returns 500 when database insert fails", async () => {
      mockDbState.shouldFail = true;
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Lab report" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal Server Error");
    });

    it("links the task to a category when category_id is given", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Submit essay", category_id: "11111111-1111-4111-8111-111111111111" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.category_id).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("returns null category_id when none is given", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Submit essay" }),
      });

      const response = await POST(req);
      const json = await response.json();
      expect(json.data.category_id).toBeNull();
    });
  });

  describe("PATCH /api/tasks/[id]", () => {
    it("returns 400, not 500, for wrongly typed fields without updating the task", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const id = mockDbState.rows[0].id;
      const cases: [string, string][] = [
        ["null", "Request body must be an object"],
        [JSON.stringify({ title: 42 }), "title must be a string"],
        [JSON.stringify({ completed: "true" }), "completed must be a boolean"],
        [JSON.stringify({ category_id: "not-a-uuid" }), "Space must be a valid identifier"],
      ];
      for (const [body, error] of cases) {
        const response = await PATCH(new Request(`http://localhost/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }), { params: Promise.resolve({ id }) });
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ success: false, error });
      }
      expect(mockDbState.rows).toEqual(before);
    });
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 400 for malformed JSON without updating a task", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const response = await PATCH(new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: '{"title":',
      }), { params: Promise.resolve({ id: "task-uuid-1" }) });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 when no updatable fields are provided", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("No updatable fields provided");
    });

    it("returns 400 when an updated color is outside the supported palette", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: "chartreuse" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("color must be a supported color");
    });

    it("returns 400 when title is blank", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("title is required");
    });

    it("returns 400 when due_at is invalid", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_at: "bad-date" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("due_at must be a valid date");
    });

    it("clears due_at when explicitly set to null, moving the task back to the inbox", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_at: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.due_at).toBeNull();
    });

    it("toggles completed", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.completed).toBe(true);
    });

    it("returns 404 when task id does not exist", async () => {
      const req = new Request("http://localhost/api/tasks/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Task not found");
    });

    it("returns 404 when attempting to update a task owned by another user", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-other", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked Title" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Task not found");
    });

    it("returns 200 with updated task data when owned by user", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Finish problem set - extended", color: "green" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Finish problem set - extended");
      expect(json.data.color).toBe("green");
    });

    it("sets category_id when given", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: "11111111-1111-4111-8111-111111111111" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.category_id).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("clears category_id when explicitly set to null, falling back to the task's own color", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.category_id).toBeNull();
    });
  });

  describe("category ownership validation", () => {
    it("POST returns 400 when category_id belongs to another user", async () => {
      mockCategoryRows.length = 0;
      mockCategoryRows.push({ id: "11111111-1111-4111-8111-111111111111", user_id: "other-user-456", color: "red" });

      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Stolen category task", category_id: "11111111-1111-4111-8111-111111111111" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(
        "The selected Space is unavailable"
      );
    });

    it("POST returns 400 when category_id does not exist", async () => {
      const req = new Request("http://localhost/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Ghost category task",
          category_id: "22222222-2222-4222-8222-222222222222",
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
      mockCategoryRows.push({ id: "11111111-1111-4111-8111-111111111111", user_id: "other-user-456", color: "red" });

      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: "11111111-1111-4111-8111-111111111111" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe(
        "The selected Space is unavailable"
      );
    });

    it("PATCH succeeds when clearing category_id with null (no ownership check needed)", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);
      expect((await response.json()).data.category_id).toBeNull();
    });
  });

  describe("DELETE /api/tasks/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 404 when task id does not exist", async () => {
      const req = new Request("http://localhost/api/tasks/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Task not found");
    });

    it("returns 404 when attempting to delete a task owned by another user", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-other", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "task-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Task not found");
    });

    it("returns 200 with deleted task data on success", async () => {
      const req = new Request("http://localhost/api/tasks/task-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("task-uuid-1");
    });

    it("removes the task's alerts and leaves everyone else's", async () => {
      mockAlertState.rows = [
        alert("alert-mine", { task_id: "task-uuid-1" }),
        alert("alert-theirs", { user_id: "other-user-456", task_id: "task-uuid-other" }),
      ];
      const response = await DELETE(
        new Request("http://localhost/api/tasks/task-uuid-1", { method: "DELETE" }),
        { params: Promise.resolve({ id: "task-uuid-1" }) }
      );
      expect(response.status).toBe(200);
      expect(mockAlertState.rows.map((a) => a.id)).toEqual(["alert-theirs"]);
    });
  });

  describe("alerts follow the due date", () => {
    const patchTask = (body: object, id = "task-uuid-1") =>
      PATCH(
        new Request(`http://localhost/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
        { params: Promise.resolve({ id }) }
      );
    const stored = (id: string) => mockAlertState.rows.find((a) => a.id === id);

    beforeEach(() => {
      mockAlertState.rows = [
        alert("alert-day", { task_id: "task-uuid-1", offset_minutes: 1440 }),
        alert("alert-due", { task_id: "task-uuid-1", offset_minutes: 0 }),
        alert("alert-theirs", { user_id: "other-user-456", task_id: "task-uuid-other" }),
      ];
    });

    it("moves each alert by its own offset when the due date changes", async () => {
      const response = await patchTask({ due_at: "2099-03-10T12:00:00Z" });
      expect(response.status).toBe(200);
      expect(stored("alert-day")?.fire_at.toISOString()).toBe("2099-03-09T12:00:00.000Z");
      expect(stored("alert-due")?.fire_at.toISOString()).toBe("2099-03-10T12:00:00.000Z");
    });

    it("lets a fired alert fire again once it lands in the future", async () => {
      stored("alert-day")!.fired_at = new Date("2026-08-14T23:59:00Z");
      await patchTask({ due_at: "2099-03-10T12:00:00Z" });
      expect(stored("alert-day")?.fired_at).toBeNull();
    });

    it("removes the task's alerts when the due date is cleared", async () => {
      const response = await patchTask({ due_at: null });
      expect(response.status).toBe(200);
      expect(mockAlertState.rows.map((a) => a.id)).toEqual(["alert-theirs"]);
    });

    it("leaves alerts alone when the due date is not part of the change", async () => {
      const before = stored("alert-day")!.fire_at.toISOString();
      await patchTask({ completed: true });
      expect(mockAlertState.rows).toHaveLength(3);
      expect(stored("alert-day")?.fire_at.toISOString()).toBe(before);
    });

    it("does not touch another user's alerts through a task id it does not own", async () => {
      const response = await patchTask({ due_at: null }, "task-uuid-other");
      expect(response.status).toBe(404);
      expect(stored("alert-theirs")).toBeDefined();
    });

    it("rolls the task change back when the alerts cannot be updated", async () => {
      mockAlertState.shouldFail = true;
      const response = await patchTask({ due_at: "2099-03-10T12:00:00Z" });
      expect(response.status).toBe(500);
      expect(mockDbState.rows.find((t) => t.id === "task-uuid-1")?.due_at?.toISOString()).toBe(
        "2026-08-15T23:59:00.000Z"
      );
    });
  });
});
