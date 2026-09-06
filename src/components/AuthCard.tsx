"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateAuthForm } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "@/components/landing/landing-button-variants";
import AuthCardShell, { authInputClassName, authLabelClassName } from "./AuthCardShell";

// NOTE ON RATE LIMITING: signInWithPassword below calls Supabase's Auth
// API directly from the browser, it never passes through this app's own
// server, so there is nowhere in our code to add a rate limiter that would
// actually see these attempts. Brute-force protection is enforced by
// Supabase itself (project's auth rate limit config: 30 sign-in requests
// per 5 minutes per IP address). See issue #62.
//
// There's no public signup: this is an MVP with a single demo account
// (see src/db/CLAUDE.md for how it's seeded). Anyone who wants in signs up
// for the waitlist on the landing page instead.
export default function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "expired_link"
      ? "That link has expired or was already used. Please try again."
      : null
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validation = validateAuthForm(email, password);
    if (!validation.valid || !validation.trimmedEmail) {
      setError(validation.error ?? "Invalid input.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.trimmedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardShell
      title="Welcome to Kalend"
      subtitle="Sign in with the demo account to try the calendar"
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className={authLabelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClassName}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={authLabelClassName}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(landingButtonVariants({ variant: "primary" }), "w-full")}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthCardShell>
  );
}
