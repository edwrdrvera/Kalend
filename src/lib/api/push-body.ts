import * as field from "@/lib/api/parse-fields";
import { parsed, rejected, type ParseResult } from "@/lib/api/parse-fields";

/** Push service URLs are long. 2048 matches the usual browser and proxy cap. */
export const MAX_PUSH_ENDPOINT_LENGTH = 2048;

/** A subscription key is a short base64url string, not a document. */
export const MAX_PUSH_KEY_LENGTH = 200;

export interface PushSubscriptionBody {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function httpsEndpoint(value: unknown): ParseResult<string> {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_PUSH_ENDPOINT_LENGTH ||
    /\s/.test(value)
  ) {
    return rejected(`endpoint must be an https URL of at most ${MAX_PUSH_ENDPOINT_LENGTH} characters`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return rejected(`endpoint must be an https URL of at most ${MAX_PUSH_ENDPOINT_LENGTH} characters`);
  }
  if (url.protocol !== "https:") {
    return rejected(`endpoint must be an https URL of at most ${MAX_PUSH_ENDPOINT_LENGTH} characters`);
  }
  return parsed(value);
}

function subscriptionKey(value: unknown, name: string): ParseResult<string> {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PUSH_KEY_LENGTH) {
    return rejected(`${name} must be a string of at most ${MAX_PUSH_KEY_LENGTH} characters`);
  }
  return parsed(value);
}

const endpointRules = {
  endpoint: httpsEndpoint,
} satisfies Record<"endpoint", (value: unknown) => ParseResult<unknown>>;

function parseEndpointObject(json: unknown): ParseResult<{ endpoint: string }> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const result = field.parsePresent(body.value, endpointRules);
  if (!result.ok) return result;
  if (result.value.endpoint === undefined) return rejected("endpoint is required");
  return parsed({ endpoint: result.value.endpoint });
}

/** The browser subscription the device wants removed. */
export function parsePushUnsubscribe(json: unknown): ParseResult<{ endpoint: string }> {
  return parseEndpointObject(json);
}

const keyRules = {
  p256dh: (value: unknown) => subscriptionKey(value, "p256dh"),
  auth: (value: unknown) => subscriptionKey(value, "auth"),
} satisfies Record<"p256dh" | "auth", (value: unknown) => ParseResult<unknown>>;

/**
 * The subscription the browser hands back from `pushManager.subscribe`.
 * `endpoint` is where this server sends the alert. `keys` encrypt it.
 */
export function parsePushSubscription(json: unknown): ParseResult<PushSubscriptionBody> {
  const body = field.asBodyObject(json);
  if (!body.ok) return body;
  const top = field.parsePresent(body.value, {
    endpoint: httpsEndpoint,
    keys: (value: unknown): ParseResult<{ p256dh: string; auth: string }> => {
      const keys = field.asBodyObject(value);
      if (!keys.ok) return rejected("keys must be an object");
      const parsedKeys = field.parsePresent(keys.value, keyRules);
      if (!parsedKeys.ok) return parsedKeys;
      if (parsedKeys.value.p256dh === undefined || parsedKeys.value.auth === undefined) {
        return rejected("p256dh and auth are required");
      }
      return parsed({ p256dh: parsedKeys.value.p256dh, auth: parsedKeys.value.auth });
    },
  });
  if (!top.ok) return top;
  if (top.value.endpoint === undefined || top.value.keys === undefined) {
    return rejected("endpoint and keys are required");
  }
  return parsed({
    endpoint: top.value.endpoint,
    p256dh: top.value.keys.p256dh,
    auth: top.value.keys.auth,
  });
}
