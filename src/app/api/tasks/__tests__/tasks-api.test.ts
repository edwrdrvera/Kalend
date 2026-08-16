import { describe, expect, it, beforeEach } from "bun:test";
import { setupMockDb, type MockDbState, type MockAuthUser } from "@/test-utils/mock-db";

interface MockTask {
  id: string;
  title: string;
  due_at: Date | null;
  completed: boolean;
  user_id: string;
  color?: string;
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

setupMockDb(
  "task-",
  mockDbState,
  () => mockCurrentUser,
  { completed: false, due_at: null } as Partial<MockTask>
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
        body: JSON.stringify({ title: "Submit essay", category_id: "category-uuid-1" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.category_id).toBe("category-uuid-1");
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
        body: JSON.stringify({ category_id: "category-uuid-1" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "task-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.data.category_id).toBe("category-uuid-1");
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
  });
});
