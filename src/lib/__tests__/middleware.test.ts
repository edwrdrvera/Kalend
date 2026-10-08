import { describe, expect, it, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

let mockSession: { user: { id: string } } | null = null;
let sessionLookupHeaders: Headers | null = null;

mock.module("../auth/server", () => ({
  auth: {
    api: {
      getSession: mock(async ({ headers }: { headers: Headers }) => {
        sessionLookupHeaders = headers;
        const responseHeaders = new Headers();
        if (mockSession) {
          responseHeaders.append("set-cookie", "better-auth.session_token=refreshed; Path=/; HttpOnly");
        }
        return { headers: responseHeaders, response: mockSession };
      }),
    },
  },
}));

const { updateSession, AUTH_USER_ID_HEADER } = await import("../auth/middleware");

describe("Auth proxy (updateSession)", () => {
  beforeEach(() => {
    mockSession = null;
    sessionLookupHeaders = null;
  });

  describe("Signed-out visitors", () => {
    it("allows the / landing page", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects /app to /login", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/app"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("allows /login", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/login"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects an API call carrying a forged user id header, and never forwards it", async () => {
      const request = new NextRequest("http://localhost:3000/api/events", {
        headers: { [AUTH_USER_ID_HEADER]: "forged-user-id" },
      });
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
      expect(response.headers.get(`x-middleware-request-${AUTH_USER_ID_HEADER}`)).toBeNull();
      expect(sessionLookupHeaders?.get(AUTH_USER_ID_HEADER)).toBeNull();
    });
  });

  describe("Signed-in users", () => {
    beforeEach(() => {
      mockSession = { user: { id: "user-uuid-999" } };
    });

    it("redirects / to /app", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/app");
    });

    it("allows /app", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/app"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects /login to /app", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/login"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/app");
    });

    it("forwards the validated user id to the destination route handler", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/api/events"));

      expect(response.status).toBe(200);
      expect(response.headers.get(`x-middleware-request-${AUTH_USER_ID_HEADER}`)).toBe("user-uuid-999");
    });

    it("replaces an inbound copy of the auth header with the validated id", async () => {
      const request = new NextRequest("http://localhost:3000/api/events", {
        headers: { [AUTH_USER_ID_HEADER]: "forged-user-id" },
      });
      const response = await updateSession(request);

      expect(response.headers.get(`x-middleware-request-${AUTH_USER_ID_HEADER}`)).toBe("user-uuid-999");
    });

    it("passes a refreshed session cookie through to the browser", async () => {
      const response = await updateSession(new NextRequest("http://localhost:3000/app"));

      expect(response.headers.getSetCookie()).toContain(
        "better-auth.session_token=refreshed; Path=/; HttpOnly"
      );
    });
  });
});
