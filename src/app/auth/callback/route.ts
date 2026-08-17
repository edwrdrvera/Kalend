import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from Supabase email links (password reset,
 * email confirmation, etc.). Exchanges the one-time code for a session,
 * then redirects to the appropriate page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Supabase includes a "next" param when the email type needs a
      // follow-up page (e.g. recovery -> /reset-password). Fall back to
      // the home page for regular confirmations.
      const next = searchParams.get("next") ?? "/reset-password";
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed: send the user to login with an
  // error hint so they know to request a new link.
  return NextResponse.redirect(
    `${origin}/login?error=expired_link`
  );
}
