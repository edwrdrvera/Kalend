// Creates (or resets the password on) the single demo account used to try
// Kalend from the landing page's /login, since this MVP has no public signup
// (see src/app/CLAUDE.md). Run with:
//
//   DEMO_USER_PASSWORD=<password> bun run db:seed:demo
//
// DEMO_USER_EMAIL defaults to demo@kalend.app if not set. Signup is disabled
// on the auth instance, so this writes the user and its password account
// through Better Auth's internal adapter instead of the sign-up endpoint.

import { auth } from "../lib/auth/server";

async function main() {
  const password = process.env.DEMO_USER_PASSWORD;
  const email = (process.env.DEMO_USER_EMAIL ?? "demo@kalend.app").toLowerCase();

  if (!password) {
    console.error(
      "DEMO_USER_PASSWORD is required.\n\n" +
        "  DEMO_USER_PASSWORD=<password> bun run db:seed:demo\n"
    );
    process.exit(1);
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  const userId =
    existing?.user.id ??
    (await ctx.internalAdapter.createUser({ email, name: "Demo", emailVerified: true }, { method: "admin" })).id;

  if (await ctx.internalAdapter.findCredentialAccount(userId)) {
    await ctx.internalAdapter.updatePassword(userId, hash);
    await ctx.internalAdapter.deleteUserSessions(userId);
    console.log(`Reset the password for demo user ${email} (${userId}) and signed out its sessions.`);
  } else {
    await ctx.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: userId, password: hash });
    console.log(`Created demo user ${email} (${userId}).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
