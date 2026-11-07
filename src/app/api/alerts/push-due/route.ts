import { pushDueAlerts } from "@/lib/api/push-due";
import { bearerMatches } from "@/lib/api/push-auth";
import { fail, ok } from "@/lib/api/route-handler";

function present(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
}

/**
 * The minute check. The server timer calls it with the bearer secret.
 * It is not a signed-in user route: there is no session on that call.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const secret = process.env.ALERT_PUSH_SECRET;
    if (!secret) return fail("Alert push is not configured", 503);
    if (!bearerMatches(request.headers.get("authorization"), secret)) {
      return fail("Unauthorized", 401);
    }
    if (!present("NEXT_PUBLIC_VAPID_PUBLIC_KEY") || !present("VAPID_PRIVATE_KEY") || !present("VAPID_SUBJECT")) {
      return fail("Alert push is not configured", 503);
    }
    return ok(await pushDueAlerts());
  } catch (error) {
    console.error("Alert push error:", error);
    return fail("Internal Server Error", 500);
  }
}
