import { beforeEach, describe, expect, it } from "bun:test";
import { setupMockDb, type MockAuthUser, type MockDbState } from "@/test-utils/mock-db";

interface MockSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const ME = "user-uuid-123";
const OTHER = "other-user-456";
const ENDPOINT = "https://push.example.com/subscription/device-1";
const KEYS = { p256dh: "p256dh-key", auth: "auth-key" };

let mockCurrentUser: MockAuthUser | null = { id: ME, email: "student@university.edu" };

const state: MockDbState<MockSubscription> = {
  rows: [],
  shouldFail: false,
  evaluateWhere: true,
  conflictsWith: (existing, incoming) => existing.endpoint === incoming.endpoint,
};

setupMockDb("push-", state, () => mockCurrentUser);

import { DELETE, POST } from "../route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));

const remove = (body: unknown) =>
  DELETE(new Request("http://localhost/api/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));

describe("push subscriptions", () => {
  beforeEach(() => {
    mockCurrentUser = { id: ME, email: "student@university.edu" };
    state.rows = [];
    state.shouldFail = false;
  });

  it("returns 401 when unauthenticated", async () => {
    mockCurrentUser = null;
    expect((await post({ endpoint: ENDPOINT, keys: KEYS })).status).toBe(401);
    expect((await remove({ endpoint: ENDPOINT })).status).toBe(401);
    expect(state.rows).toHaveLength(0);
  });

  it("saves the signed-in user's device", async () => {
    const response = await post({ endpoint: ENDPOINT, keys: KEYS });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { endpoint: ENDPOINT } });
    expect(state.rows).toEqual([
      expect.objectContaining({
        user_id: ME,
        endpoint: ENDPOINT,
        p256dh: KEYS.p256dh,
        auth: KEYS.auth,
      }),
    ]);
  });

  it("updates the same endpoint instead of storing a second row", async () => {
    await post({ endpoint: ENDPOINT, keys: KEYS });
    const response = await post({
      endpoint: ENDPOINT,
      keys: { p256dh: "next-p256dh", auth: "next-auth" },
    });
    expect(response.status).toBe(200);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({
      user_id: ME,
      p256dh: "next-p256dh",
      auth: "next-auth",
    });
  });

  it("gives the device to the user who subscribes it", async () => {
    state.rows = [{
      id: "sub-other",
      user_id: OTHER,
      endpoint: ENDPOINT,
      p256dh: "old",
      auth: "old",
    }];
    await post({ endpoint: ENDPOINT, keys: KEYS });
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].user_id).toBe(ME);
  });

  it("rejects a bad endpoint and an unknown field without writing", async () => {
    expect((await post({ endpoint: "http://push.example.com/a", keys: KEYS })).status).toBe(400);
    expect((await post({ endpoint: ENDPOINT, keys: KEYS, user_id: OTHER })).status).toBe(400);
    expect(state.rows).toHaveLength(0);
  });

  it("removes only the signed-in user's device", async () => {
    state.rows = [
      { id: "sub-mine", user_id: ME, endpoint: ENDPOINT, p256dh: "a", auth: "b" },
      {
        id: "sub-other",
        user_id: OTHER,
        endpoint: "https://push.example.com/subscription/other",
        p256dh: "c",
        auth: "d",
      },
    ];
    const response = await remove({ endpoint: ENDPOINT });
    expect(await response.json()).toEqual({ success: true, data: { removed: true } });
    expect(state.rows.map((row) => row.id)).toEqual(["sub-other"]);
  });

  it("does not remove another user's subscription for the same endpoint", async () => {
    state.rows = [{
      id: "sub-other",
      user_id: OTHER,
      endpoint: ENDPOINT,
      p256dh: "a",
      auth: "b",
    }];
    const response = await remove({ endpoint: ENDPOINT });
    expect(await response.json()).toEqual({ success: true, data: { removed: false } });
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].user_id).toBe(OTHER);
  });
});
