import { describe, expect, it, mock, beforeEach } from "bun:test";

interface MockCategory {
  id: string;
  name: string;
  user_id: string;
  color?: string;
  created_at?: Date;
}

let mockCurrentUser: { id: string; email: string } | null = {
  id: "user-uuid-123",
  email: "student@university.edu",
};

const mockDbState = {
  categories: [] as MockCategory[],
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
        if (val.startsWith("category-") || val.includes("existent")) return val;
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
            return mockDbState.categories.filter((c) => c.user_id === mockCurrentUser!.id);
          }),
        }),
      }),
      insert: () => ({
        // Mirrors real Drizzle/postgres-js behavior: a key present with an
        // `undefined` value is treated the same as an omitted key (falls
        // back to the column default), not as an explicit overwrite.
        values: (vals: Record<string, unknown>) => ({
          returning: mock(async () => {
            if (mockDbState.shouldFail) throw new Error("DB Insert failed");
            const definedVals = Object.fromEntries(
              Object.entries(vals).filter(([, v]) => v !== undefined)
            );
            const row = {
              id: "category-uuid-1",
              created_at: new Date(),
              color: "blue",
              ...definedVals,
            } as MockCategory;
            mockDbState.categories.push(row);
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
              const idx = mockDbState.categories.findIndex(
                (c) => c.id === targetId && (!mockCurrentUser || c.user_id === mockCurrentUser.id)
              );
              if (idx === -1) return [];
              const updated = { ...mockDbState.categories[idx], ...vals };
              mockDbState.categories[idx] = updated;
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
            const idx = mockDbState.categories.findIndex(
              (c) => c.id === targetId && (!mockCurrentUser || c.user_id === mockCurrentUser.id)
            );
            if (idx === -1) return [];
            const [deleted] = mockDbState.categories.splice(idx, 1);
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

describe("Categories API Endpoints", () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: "user-uuid-123",
      email: "student@university.edu",
    };
    mockDbState.categories = [
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
      expect(json.error).toBe("Category not found");
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
      expect(json.error).toBe("Category not found");
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
      expect(json.error).toBe("Category not found");
    });

    it("returns 404 when attempting to delete a category owned by another user", async () => {
      const req = new Request("http://localhost/api/categories/category-uuid-other", {
        method: "DELETE",
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: "category-uuid-other" }) });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Category not found");
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
    });
  });
});
