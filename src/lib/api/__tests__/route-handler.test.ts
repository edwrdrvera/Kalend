import { describe, expect, it, beforeEach, mock } from "bun:test";
import type { MockAuthUser } from "@/test-utils/mock-db";

let mockCurrentUser: MockAuthUser | null = { id: "user-1", email: "a@b.edu" };

mock.module("@/lib/supabase/auth-user", () => ({
  getAuthenticatedUser: mock(async () => mockCurrentUser),
}));

// Import after the module mock is registered.
import { withUser, ok, fail } from "../route-handler";

describe("withUser", () => {
  beforeEach(() => {
    mockCurrentUser = { id: "user-1", email: "a@b.edu" };
  });

  it("returns 401 without invoking the handler when unauthenticated", async () => {
    mockCurrentUser = null;
    let called = false;
    const handler = withUser(async () => {
      called = true;
      return ok(null);
    });

    const response = await handler(new Request("http://localhost/api/x"), undefined);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: "Unauthorized" });
    expect(called).toBe(false);
  });

  it("passes the request, context, and verified user through to the handler", async () => {
    const handler = withUser(async (request, context: { params: Promise<{ id: string }> }, user) => {
      const { id } = await context.params;
      return ok({ id, userId: user.id, method: request.method });
    });

    const response = await handler(
      new Request("http://localhost/api/x/42", { method: "PATCH" }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { id: "42", userId: "user-1", method: "PATCH" },
    });
  });

  it("maps a thrown SyntaxError to a 400 without logging it", async () => {
    const handler = withUser(async () => {
      // A malformed body makes request.json() throw SyntaxError.
      throw new SyntaxError("Unexpected end of JSON input");
    });

    const response = await handler(new Request("http://localhost/api/x"), undefined);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: "Request body must be valid JSON",
    });
  });

  it("maps any other thrown error to a 500", async () => {
    const handler = withUser(async () => {
      throw new Error("DB Connection failed");
    });

    const response = await handler(new Request("http://localhost/api/x"), undefined);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "Internal Server Error",
    });
  });

  it("preserves the status the handler chose", async () => {
    const handler = withUser(async () => ok({ created: true }, { status: 201 }));

    const response = await handler(new Request("http://localhost/api/x", { method: "POST" }), undefined);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: { created: true } });
  });
});

describe("envelope helpers", () => {
  it("ok wraps data as a success envelope, defaulting to 200", async () => {
    const response = ok([1, 2, 3]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: [1, 2, 3] });
  });

  it("fail wraps an error message at the given status", async () => {
    const response = fail("Event not found", 404);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: "Event not found" });
  });
});
