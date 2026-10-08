import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const SESSION_COOKIE = "better-auth.session_token=signed; Path=/; HttpOnly; SameSite=Lax";

let signInError: Error | null = null;
const signInEmail = mock(async (params: { body: { email: string; password: string } }) => {
  void params;
  if (signInError) throw signInError;
  const headers = new Headers();
  headers.append("set-cookie", SESSION_COOKIE);
  return { headers, response: { token: "t" } };
});

mock.module("@/lib/auth/server", () => ({ auth: { api: { signInEmail } } }));

const { GET } = await import("../route");

const request = (query = "") => new Request(`http://localhost:3000/api/dev/sign-in${query}`);

describe("GET /api/dev/sign-in", () => {
  beforeEach(() => {
    env.NODE_ENV = "development";
    env.KALEND_DEV_SIGN_IN = "1";
    env.DEMO_USER_EMAIL = "demo@example.com";
    env.DEMO_USER_PASSWORD = "demo-password";
    signInError = null;
    signInEmail.mockClear();
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    delete env.KALEND_DEV_SIGN_IN;
  });

  it("returns 404 and signs no one in outside development, even when enabled", async () => {
    env.NODE_ENV = "production";

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("returns 404 in development unless KALEND_DEV_SIGN_IN is 1", async () => {
    delete env.KALEND_DEV_SIGN_IN;

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in the demo account, not an email from the request, and redirects to /app with the session cookie", async () => {
    const response = await GET(request("?email=someone-else@example.com"));

    expect(signInEmail.mock.calls[0][0].body).toEqual({ email: "demo@example.com", password: "demo-password" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
    expect(response.headers.getSetCookie()).toEqual([SESSION_COOKIE]);
  });

  it("returns 500 with no session cookie when sign-in fails", async () => {
    signInError = new Error("Invalid email or password");

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it.each(["DEMO_USER_EMAIL", "DEMO_USER_PASSWORD"])("returns a 500 JSON error when %s is missing", async (name) => {
    delete env[name];

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect((await response.json()).success).toBe(false);
    expect(signInEmail).not.toHaveBeenCalled();
  });
});
