import { NextResponse } from "next/server";
import { fail } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

// Signs the browser in as the demo account without anyone typing its
// password, so unattended verify runs can reach /app. Development only and
// opt-in: outside `next dev` with KALEND_DEV_SIGN_IN=1 the route doesn't
// exist. It never reads an email from the request, so it can't sign in anyone
// but the demo user.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.KALEND_DEV_SIGN_IN !== "1") {
    return fail("Not found", 404);
  }

  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!email || !password) {
    return fail("DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be set in .env.local", 500);
  }

  let sessionHeaders: Headers;
  try {
    ({ headers: sessionHeaders } = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      returnHeaders: true,
    }));
  } catch (error) {
    return fail(`Could not sign in: ${error instanceof Error ? error.message : String(error)}`, 500);
  }

  const response = NextResponse.redirect(new URL("/app", request.url));
  for (const cookie of sessionHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
