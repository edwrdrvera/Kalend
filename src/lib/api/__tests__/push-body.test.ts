import { describe, expect, it } from "bun:test";
import { MAX_PUSH_ENDPOINT_LENGTH, parsePushSubscription, parsePushUnsubscribe } from "@/lib/api/push-body";

const ENDPOINT = "https://push.example.com/subscription/device-1";
const KEYS = { p256dh: "p256dh-key", auth: "auth-key" };

describe("parsePushSubscription", () => {
  it("accepts an https endpoint and the two keys", () => {
    expect(parsePushSubscription({ endpoint: ENDPOINT, keys: KEYS })).toEqual({
      ok: true,
      value: { endpoint: ENDPOINT, p256dh: KEYS.p256dh, auth: KEYS.auth },
    });
  });

  it("accepts an https endpoint of exactly 2048 characters", () => {
    const endpoint = `https://push.example.com/${"a".repeat(MAX_PUSH_ENDPOINT_LENGTH - "https://push.example.com/".length)}`;
    expect(endpoint).toHaveLength(MAX_PUSH_ENDPOINT_LENGTH);
    expect(parsePushSubscription({ endpoint, keys: KEYS }).ok).toBe(true);
  });

  it.each([
    [{ keys: KEYS }, "endpoint and keys are required"],
    [{ endpoint: ENDPOINT }, "endpoint and keys are required"],
    [{ endpoint: "http://push.example.com/a", keys: KEYS }, "endpoint must be an https URL of at most 2048 characters"],
    [{ endpoint: "https://push.example.com/a extra", keys: KEYS }, "endpoint must be an https URL of at most 2048 characters"],
    [
      { endpoint: `https://push.example.com/${"a".repeat(MAX_PUSH_ENDPOINT_LENGTH)}`, keys: KEYS },
      "endpoint must be an https URL of at most 2048 characters",
    ],
    [{ endpoint: ENDPOINT, keys: { auth: KEYS.auth } }, "p256dh and auth are required"],
    [{ endpoint: ENDPOINT, keys: { p256dh: KEYS.p256dh } }, "p256dh and auth are required"],
    [{ endpoint: ENDPOINT, keys: { p256dh: "", auth: KEYS.auth } }, "p256dh must be a string of at most 200 characters"],
    [{ endpoint: ENDPOINT, keys: { p256dh: "x".repeat(201), auth: KEYS.auth } }, "p256dh must be a string of at most 200 characters"],
    [{ endpoint: ENDPOINT, keys: { p256dh: KEYS.p256dh, auth: "" } }, "auth must be a string of at most 200 characters"],
    [{ endpoint: ENDPOINT, keys: [] }, "keys must be an object"],
    [{ endpoint: ENDPOINT, keys: KEYS, expirationTime: null }, "Unknown field: expirationTime"],
    [{ endpoint: ENDPOINT, keys: { ...KEYS, extra: 1 } }, "Unknown field: extra"],
    [[], "Request body must be an object"],
    [null, "Request body must be an object"],
  ])("rejects %j", (body, error) => {
    expect(parsePushSubscription(body)).toEqual({ ok: false, error });
  });
});

describe("parsePushUnsubscribe", () => {
  it("accepts the endpoint on its own", () => {
    expect(parsePushUnsubscribe({ endpoint: ENDPOINT })).toEqual({
      ok: true,
      value: { endpoint: ENDPOINT },
    });
  });

  it("rejects a non-https endpoint and unknown fields", () => {
    expect(parsePushUnsubscribe({ endpoint: "http://push.example.com/a" })).toEqual({
      ok: false,
      error: "endpoint must be an https URL of at most 2048 characters",
    });
    expect(parsePushUnsubscribe({ endpoint: ENDPOINT, keys: KEYS })).toEqual({
      ok: false,
      error: "Unknown field: keys",
    });
  });
});
