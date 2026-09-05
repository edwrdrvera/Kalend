import { describe, expect, it, mock, beforeEach } from "bun:test";

let emails: string[] = [];
let shouldFail = false;
let failCode: string | undefined;

mock.module("@/db", () => ({
  db: {
    insert: () => ({
      values: mock(async ({ email }: { email: string }) => {
        if (shouldFail) {
          const error = new Error("DB Insert failed") as Error & { code?: string };
          if (failCode) error.code = failCode;
          throw error;
        }
        if (emails.includes(email)) {
          const error = new Error("duplicate key value violates unique constraint") as Error & {
            code?: string;
          };
          error.code = "23505";
          throw error;
        }
        emails.push(email);
      }),
    }),
  },
}));

// Import route handler after mock setup
import { POST } from "../route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    emails = [];
    shouldFail = false;
    failCode = undefined;
  });

  it("adds a valid email to the waitlist", async () => {
    const response = await POST(postRequest({ email: "student@university.edu" }));
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.email).toBe("student@university.edu");
    expect(emails).toContain("student@university.edu");
  });

  it("trims and lowercases the email before storing it", async () => {
    await POST(postRequest({ email: "  Student@University.edu  " }));
    expect(emails).toContain("student@university.edu");
  });

  it("returns 400 when email is missing", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("A valid email address is required");
  });

  it("returns 400 when email is not a valid address", async () => {
    const response = await POST(postRequest({ email: "not-an-email" }));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it("returns 201 (not an error) when the email is already on the list", async () => {
    emails.push("repeat@university.edu");
    const response = await POST(postRequest({ email: "repeat@university.edu" }));
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when the database throws a non-duplicate error", async () => {
    shouldFail = true;
    const response = await POST(postRequest({ email: "student@university.edu" }));
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Internal Server Error");
  });
});
