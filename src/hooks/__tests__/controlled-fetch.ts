export interface HeldRequest {
  url: string;
  method: string;
  body: unknown;
  respond: (body: unknown, status?: number) => void;
}

/**
 * Replaces `fetch` with one that holds every request until the test answers
 * it, so a test can settle requests in any order it likes.
 */
export function holdRequests(): HeldRequest[] {
  const requests: HeldRequest[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve) => {
      requests.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        respond: (body, status = 200) =>
          resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })),
      });
    })) as typeof fetch;
  return requests;
}
