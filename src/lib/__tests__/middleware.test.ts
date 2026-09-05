import { describe, expect, it, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

let mockUser: { id: string; email: string } | null = null;
const cookiesSet: Array<{ name: string; value: string }> = [];

interface SupabaseClientOptions {
  cookies: {
    getAll: () => unknown;
    setAll: (cookies: Array<{ name: string; value: string; options?: object }>) => void;
  };
}

mock.module("@supabase/ssr", () => {
  return {
    createServerClient: mock((_url: string, _key: string, options: SupabaseClientOptions) => {
      return {
        auth: {
          getUser: mock(async () => {
            // Emulate cookie read/write during getUser
            options.cookies.getAll();
            if (mockUser) {
              options.cookies.setAll([
                { name: "sb-auth-token", value: "refreshed-token", options: { path: "/" } },
              ]);
            }
            return { data: { user: mockUser }, error: null };
          }),
        },
      };
    }),
  };
});

import { updateSession } from "../supabase/middleware";

describe("Auth Middleware (updateSession)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    mockUser = null;
    cookiesSet.length = 0;
  });

  describe("Unauthenticated Visitors", () => {
    it("allows unauthenticated visitor to access the / landing page", async () => {
      const request = new NextRequest("http://localhost:3000/");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects unauthenticated visitor from /app to /login", async () => {
      const request = new NextRequest("http://localhost:3000/app");
      const response = await updateSession(request);

      expect(response.status).toBe(307); // NextResponse.redirect default status
      const location = response.headers.get("location");
      expect(location).toBe("http://localhost:3000/login");
    });

    it("allows unauthenticated visitor to access /login", async () => {
      const request = new NextRequest("http://localhost:3000/login");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Authenticated Users", () => {
    beforeEach(() => {
      mockUser = { id: "user-uuid-999", email: "student@university.edu" };
    });

    it("redirects authenticated user from / to /app", async () => {
      const request = new NextRequest("http://localhost:3000/");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("http://localhost:3000/app");
    });

    it("allows authenticated user to access /app directly", async () => {
      const request = new NextRequest("http://localhost:3000/app");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects authenticated user from /login to /app", async () => {
      const request = new NextRequest("http://localhost:3000/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("http://localhost:3000/app");
    });

    it("allows authenticated user to access API endpoints", async () => {
      const request = new NextRequest("http://localhost:3000/api/events");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });
});
