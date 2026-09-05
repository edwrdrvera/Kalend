"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "@/components/landing/landing-button-variants";
import AuthCardShell, { authInputClassName, authLabelClassName, authLinkClassName } from "@/components/AuthCardShell";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: `${window.location.origin}/auth/callback` }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardShell
      title="Reset your password"
      subtitle="Enter your email and we'll send a reset link"
      error={error}
      info={
        sent ? "Check your email for a password reset link. You can close this page." : null
      }
      footer={
        <p>
          Back to{" "}
          <Link href="/login" className={authLinkClassName}>
            Sign in
          </Link>
        </p>
      }
    >
      {!sent && (
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

          <button
            type="submit"
            disabled={loading}
            className={cn(landingButtonVariants({ variant: "primary" }), "w-full")}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>
      )}
    </AuthCardShell>
  );
}
