import { describe, expect, it, beforeEach } from "bun:test";
import { setupMockDb, type MockDbState, type MockAuthUser } from "@/test-utils/mock-db";

interface MockCategory {
  id: string;
  name: string;
  user_id: string;
  color?: string;
  created_at?: Date;
}

interface MockEventRow {
  id: string;
  user_id: string;
  category_id: string | null;
  color: string;
  color_overridden: boolean;
}

interface MockTaskRow {
  id: string;
  user_id: string;
  category_id: string | null;
  color: string;
  color_overridden: boolean;
  title: string;
}

let mockCurrentUser: MockAuthUser | null = {
  id: "user-uuid-123",
  email: "student@university.edu",
};

const mockDbState: MockDbState<MockCategory> = {
  rows: [],
  shouldFail: false,
};
const mockEventState: MockDbState<MockEventRow> = { rows: [], shouldFail: false };
const mockTaskState: MockDbState<MockTaskRow> = { rows: [], shouldFail: false };

// filterUndefined: true mirrors real Drizzle/postgres-js behavior where a
// key present with an `undefined` value falls back to the column default.
setupMockDb(
  "category-",
  mockDbState,
  () => mockCurrentUser,
  { color: "blue" } as Partial<MockCategory>,
  true,
  () => [],
  { events: mockEventState, tasks: mockTaskState }
);

// Import route handlers after mock setup
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

describe("Categories API Endpoints", () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: "user-uuid-123",
      email: "student@university.edu",
    };
    mockDbState.rows = [
      {
        id: "category-uuid-1",
        name: "CS 101",
        user_id: "user-uuid-123",
        color: "blue",
      },
      {
        id: "category-uuid-other",
        name: "Other User's Category",
        user_id: "other-user-456",
        color: "red",
      },
    ];
    mockDbState.shouldFail = false;
    mockDbState.shouldFailOnDelete = false;
    mockDbState.transactionCount = 0;
    mockDbState.lockCount = 0;
    mockEventState.rows = [
      { id: "evt-linked-inherited", user_id: "user-uuid-123", category_id: "category-uuid-1", color: "purple", color_overridden: false },
      { id: "evt-linked-override", user_id: "user-uuid-123", category_id: "category-uuid-1", color: "red", color_overridden: true },
      { id: "evt-other-space", user_id: "user-uuid-123", category_id: "category-other", color: "teal", color_overridden: false },
      { id: "evt-foreign", user_id: "other-user-456", category_id: "category-uuid-1", color: "pink", color_overridden: false },
    ];
    mockEventState.shouldFail = false;
    mockTaskState.rows = [
      { id: "task-linked-inherited", title: "Inherited task", user_id: "user-uuid-123", category_id: "category-uuid-1", color: "purple", color_overridden: false },
      { id: "task-linked-override", title: "Override task", user_id: "user-uuid-123", category_id: "category-uuid-1", color: "red", color_overridden: true },
      { id: "task-other-space", title: "Other task", user_id: "user-uuid-123", category_id: "category-other", color: "teal", color_overridden: false },
      { id: "task-foreign", title: "Foreign task", user_id: "other-user-456", category_id: "category-uuid-1", color: "pink", color_overridden: false },
    ];
    mockTaskState.shouldFail = false;
  });

  describe("GET /api/categories", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const response = await GET();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 200 with only the authenticated user's categories", async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].name).toBe("CS 101");
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

  describe("POST /api/categories", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Work" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("returns 400 for malformed JSON without inserting a category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"name":',
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for non-object bodies without inserting a category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const body of ["null", "[]", '"Work"', "42"]) {
        const req = new Request("http://localhost/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("Request body must be an object");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for non-string names without inserting a category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const name of [null, 42, {}, []]) {
        const req = new Request("http://localhost/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("name must be a string");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 when name is missing", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: "green" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("name is required");
    });

    it("returns 400 when name is blank", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("name is required");
    });

    it("returns 201 with created category and binds user_id from session", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Work", color: "purple" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Work");
      expect(json.data.user_id).toBe("user-uuid-123");
      expect(json.data.color).toBe("purple");
    });

    it("returns 201 with the default color when color is omitted", async () => {
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Personal" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.data.color).toBe("blue");
    });

    it("returns 500 when database insert fails", async () => {
      mockDbState.shouldFail = true;
      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Work" }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal Server Error");
    });
  });

  describe("PATCH /api/categories/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 400 for malformed JSON without updating the category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: '{"name":',
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Request body must be valid JSON",
      });
      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for non-object bodies without updating the category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const body of ["null", "[]", '"Updated"', "42"]) {
        const req = new Request("http://localhost/api/categories/category-uuid-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });

        const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("Request body must be an object");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 for non-string names without updating the category", async () => {
      const before = mockDbState.rows.map((row) => ({ ...row }));

      for (const name of [null, 42, {}, []]) {
        const req = new Request("http://localhost/api/categories/category-uuid-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });

        const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toBe("name must be a string");
      }

      expect(mockDbState.rows).toEqual(before);
    });

    it("returns 400 when no updatable fields are provided", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("No updatable fields provided");
    });

    it("returns 400 when name is blank", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("name is required");
    });

    it("returns 404 when category id does not exist", async () => {
      const req = new Request("http://localhost/api/categories/non-existent-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Space not found");
    });

    it("returns 404 when attempting to update a category owned by another user", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-other", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hacked Name" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Space not found");
    });

    it("returns 200 with updated category data when owned by user, recoloring in place", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "CS 101 - Fall", color: "teal" }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("CS 101 - Fall");
      expect(json.data.color).toBe("teal");
    });
  });

  describe("DELETE /api/categories/[id]", () => {
    it("returns 401 when user is unauthenticated", async () => {
      mockCurrentUser = null;
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(401);
    });

    it("returns 404 when category id does not exist", async () => {
      const req = new Request("http://localhost/api/categories/non-existent-id", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Space not found");
    });

    it("returns 404 when attempting to delete a category owned by another user", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-other", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Space not found");
    });

    it("returns 200 with deleted category data on success", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("category-uuid-1");
      expect(json.events).toHaveLength(2);
      expect(json.events.find((event: MockEventRow) => event.id === "evt-linked-inherited")).toMatchObject({ category_id: null, color: "blue", color_overridden: false });
      expect(json.events.find((event: MockEventRow) => event.id === "evt-linked-override")).toMatchObject({ category_id: null, color: "red", color_overridden: true });
      expect(json.tasks).toHaveLength(2);
      expect(json.tasks.find((task: MockTaskRow) => task.id === "task-linked-inherited")).toMatchObject({ category_id: null, color: "blue", color_overridden: false });
      expect(json.tasks.find((task: MockTaskRow) => task.id === "task-linked-override")).toMatchObject({ category_id: null, color: "red", color_overridden: true });
      expect(mockEventState.rows.find((event) => event.id === "evt-other-space")?.category_id).toBe("category-other");
      expect(mockEventState.rows.find((event) => event.id === "evt-foreign")?.category_id).toBe("category-uuid-1");
      expect(mockTaskState.rows.find((task) => task.id === "task-other-space")?.category_id).toBe("category-other");
      expect(mockTaskState.rows.find((task) => task.id === "task-foreign")?.category_id).toBe("category-uuid-1");
      expect(mockDbState.lockCount).toBeGreaterThanOrEqual(3);
    });

    it("returns empty events and tasks arrays when the deleted Space has no linked items", async () => {
      mockEventState.rows = mockEventState.rows.filter(
        (event) => event.category_id !== "category-uuid-1"
      );
      mockTaskState.rows = mockTaskState.rows.filter(
        (task) => task.category_id !== "category-uuid-1"
      );
      const req = new Request("http://localhost/api/categories/category-uuid-1", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-1" }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.events).toEqual([]);
      expect(json.tasks).toEqual([]);
    });

    it("rolls back detached events and tasks when deleting the Space fails", async () => {
      mockDbState.shouldFailOnDelete = true;
      const beforeEvents = mockEventState.rows.map((event) => ({ ...event }));
      const beforeTasks = mockTaskState.rows.map((task) => ({ ...task }));
      const req = new Request("http://localhost/api/categories/category-uuid-1", { method: "DELETE" });
      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-1" }) });
      expect(response.status).toBe(500);
      expect(mockEventState.rows).toEqual(beforeEvents);
      expect(mockTaskState.rows).toEqual(beforeTasks);
      expect(mockDbState.rows.some((category) => category.id === "category-uuid-1")).toBe(true);
    });
  });
});
