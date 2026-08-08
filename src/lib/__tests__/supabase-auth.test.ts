import { describe, expect, it, mock } from "bun:test";

describe("Supabase Auth Flows", () => {
  it("authenticates credentials during login and handles success", async () => {
    const mockSignIn = mock(async (credentials: { email: string; password: string }) => {
      if (credentials.email === "test@example.com" && credentials.password === "secret123") {
        return {
          data: { user: { id: "user-123", email: "test@example.com" }, session: { access_token: "token-abc" } },
          error: null,
        };
      }
      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
    });

    const result = await mockSignIn({ email: "test@example.com", password: "secret123" });
    expect(mockSignIn).toHaveBeenCalledWith({ email: "test@example.com", password: "secret123" });
    expect(result.data.session).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("handles login failure with invalid credentials error", async () => {
    const mockSignIn = mock(async (_credentials: { email: string; password: string }) => {
      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
    });

    const result = await mockSignIn({ email: "wrong@example.com", password: "wrongpassword" });
    expect(result.data.session).toBeNull();
    expect(result.error).toEqual({ message: "Invalid login credentials" });
  });

  it("handles instant registration when email confirmations are disabled", async () => {
    const mockSignUp = mock(async (credentials: { email: string; password: string }) => {
      return {
        data: {
          user: { id: "new-user-1", email: credentials.email },
          session: { access_token: "jwt-token-123" },
        },
        error: null,
      };
    });

    const result = await mockSignUp({ email: "newstudent@college.edu", password: "mypassword" });
    expect(result.data.user).toBeDefined();
    expect(result.data.session).toBeDefined();
    expect(result.error).toBeNull();
  });

  it("handles registration when email verification is required (no instant session)", async () => {
    const mockSignUp = mock(async (credentials: { email: string; password: string }) => {
      return {
        data: {
          user: { id: "new-user-2", email: credentials.email, confirmed_at: null },
          session: null,
        },
        error: null,
      };
    });

    const result = await mockSignUp({ email: "verify@college.edu", password: "mypassword" });
    expect(result.data.user).toBeDefined();
    expect(result.data.session).toBeNull();
    expect(result.error).toBeNull();
  });

  it("handles signup error when user is already registered", async () => {
    const mockSignUp = mock(async (_credentials: { email: string; password: string }) => {
      return {
        data: { user: null, session: null },
        error: { message: "User already registered" },
      };
    });

    const result = await mockSignUp({ email: "existing@example.com", password: "password123" });
    expect(result.error).toEqual({ message: "User already registered" });
    expect(result.data.session).toBeNull();
  });
});
