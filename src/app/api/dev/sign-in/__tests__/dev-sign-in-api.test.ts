import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

let linkError: { message: string } | null = null;
const generateLink = mock(async (params: { type: string; email: string }) => {
  void params;
  return linkError
    ? { data: null, error: linkError }
    : { data: { properties: { hashed_token: "hashed-token-1" } }, error: null };
});
const verifyOtp = mock(async (params: { type: string; token_hash: string }) => {
  void params;
  return { error: null };
});

mock.module("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { admin: { generateLink } } }),
}));
mock.module("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp } }),
}));

const { GET } = await import("../route");

const request = (query = "") => new Request(`http://localhost:3000/api/dev/sign-in${query}`);

describe("GET /api/dev/sign-in", () => {
  beforeEach(() => {
    env.NODE_ENV = "development";
    env.KALEND_DEV_SIGN_IN = "1";
    env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    env.DEMO_USER_EMAIL = "demo@example.com";
    linkError = null;
    generateLink.mockClear();
    verifyOtp.mockClear();
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    delete env.KALEND_DEV_SIGN_IN;
  });

  it("returns 404 and signs no one in outside development, even when enabled", async () => {
    env.NODE_ENV = "production";

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("returns 404 in development unless KALEND_DEV_SIGN_IN is 1", async () => {
    delete env.KALEND_DEV_SIGN_IN;

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("signs in the demo account, not an email from the request, and redirects to /app", async () => {
    const response = await GET(request("?email=someone-else@example.com"));

    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "demo@example.com" });
    expect(verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "hashed-token-1" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
  });

  it("returns 500 without redeeming anything when the link can't be created", async () => {
    linkError = { message: "User not found" };

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("returns 500 when the service role key is missing", async () => {
    delete env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
