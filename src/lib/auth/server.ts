import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // No self-serve signup in this MVP: the demo account is created by
  // src/db/seed-demo-user.ts, which writes through auth.$context instead.
  emailAndPassword: { enabled: true, disableSignUp: true },
  // Better Auth only rate limits in production unless told otherwise.
  rateLimit: { enabled: true },
  advanced: { database: { generateId: "uuid" } },
  plugins: [nextCookies()],
});
