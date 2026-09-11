// Generic fetch-then-check wrapper used by every create/edit/delete/move
// handler. Doesn't enforce `data` being present since DELETE's response
// doesn't include it; callers that need `data` check after.

export interface MutationResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function mutateResource<
  T,
  TResponse extends MutationResponse<T> = MutationResponse<T>,
>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: object | undefined,
  fallbackError: string
): Promise<TResponse> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: TResponse = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? fallbackError);
  }
  return json;
}
