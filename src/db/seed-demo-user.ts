// Creates (or resets the password on) the single demo account used to try
// Kalend from the landing page's /login, since this MVP has no public
// signup (see src/app/CLAUDE.md). Run once per environment with:
//
//   SUPABASE_SERVICE_ROLE_KEY=<key> DEMO_USER_PASSWORD=<password> bun run db:seed:demo
//
// SUPABASE_SERVICE_ROLE_KEY is from Project Settings > API. It bypasses
// Auth entirely, so: never put it in .env.local's NEXT_PUBLIC_* vars, never
// commit it, and never use it outside a one-off local/CI script like this
// one. DEMO_USER_EMAIL defaults to demo@kalend.app if not set.

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DEMO_USER_PASSWORD;
  const email = process.env.DEMO_USER_EMAIL ?? "demo@kalend.app";

  if (!supabaseUrl || !serviceRoleKey || !password) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_USER_PASSWORD are all required.\n\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=<key> DEMO_USER_PASSWORD=<password> bun run db:seed:demo\n"
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look for an existing user with this email first: createUser errors if
  // one already exists, and re-running this script (e.g. to rotate the
  // password) should just update it instead of failing.
  const { data: existing, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const existingUser = existing.users.find((u) => u.email === email);

  if (existingUser) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      password,
    });
    if (updateError) {
      console.error("Failed to update demo user's password:", updateError.message);
      process.exit(1);
    }
    console.log(`Updated password for existing demo user ${email} (${existingUser.id}).`);
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      console.error("Failed to create demo user:", createError.message);
      process.exit(1);
    }
    console.log(`Created demo user ${email} (${created.user.id}).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
