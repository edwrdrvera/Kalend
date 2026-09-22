import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/supabase/auth-user";

/**
 * The two halves of the API response envelope (see `src/app/api/CLAUDE.md`).
 * Every user-facing handler returns one shape or the other, so the literal
 * `{ success, ... }` object lives here instead of being retyped per route.
 */
export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ success: true, data }, init);

export const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

type AuthedHandler<Context> = (
  request: Request,
  context: Context,
  user: AuthenticatedUser
) => Promise<Response>;

/**
 * Wraps a route handler in the shell every authenticated endpoint shares:
 * resolve the caller, 401 when there is none, and turn a thrown error into
 * the right envelope. A `SyntaxError` from `request.json()` becomes a 400
 * ("Request body must be valid JSON"); anything else is logged and 500.
 *
 * The handler receives the verified `user` as a third argument, so its body
 * is only the resource logic. It still owns everything past auth: the
 * `eq(table.user_id, user.id)` scope on every query, body-shape validation,
 * and the success envelope. Scoping stays the handler's job on purpose so
 * this wrapper never gives a false sense that access control is handled.
 */
export function withUser<Context = unknown>(handler: AuthedHandler<Context>) {
  // request and context are optional so collection routes stay callable as
  // GET() / POST(request), matching how Next invokes them and how the route
  // tests drive them. Next always supplies both to a dynamic [id] route.
  return async (request?: Request, context?: Context): Promise<Response> => {
    try {
      const user = await getAuthenticatedUser();
      if (!user) return fail("Unauthorized", 401);
      return await handler(request as Request, context as Context, user);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return fail("Request body must be valid JSON", 400);
      }
      console.error("Database Error:", error);
      return fail("Internal Server Error", 500);
    }
  };
}
