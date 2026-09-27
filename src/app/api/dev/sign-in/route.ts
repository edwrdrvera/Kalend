import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { fail } from "@/lib/api/route-handler";
import { createClient } from "@/lib/supabase/server";

// Signs the browser in as the demo account without anyone typing its
// password, so unattended verify runs can reach /app. Development only and
// opt-in: the service role key it needs can act as any user, so outside
// `next dev` with KALEND_DEV_SIGN_IN=1 the route doesn't exist. It never reads
// an email from the request, so it can't sign in anyone but the demo user.
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.KALEND_DEV_SIGN_IN !== "1") {
    return fail("Not found", 404);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.DEMO_USER_EMAIL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !email || !serviceRoleKey) {
    return fail(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DEMO_USER_EMAIL, and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
      500
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    return fail(`Could not create a sign-in link: ${error.message}`, 500);
  }

  // Redeeming the token through the cookie-backed server client is what
  // writes the session cookies onto this response.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) {
    return fail(`Could not sign in: ${verifyError.message}`, 500);
  }

  return NextResponse.redirect(new URL("/app", request.url));
}
