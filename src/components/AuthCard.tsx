"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_REQUIREMENTS_HINT, validateAuthForm } from "@/lib/auth-validation";

// NOTE ON RATE LIMITING: signInWithPassword/signUp below call Supabase's
// Auth API directly from the browser, they never pass through this app's
// own server, so there is nowhere in our code to add a rate limiter that
// would actually see these attempts. Brute-force protection is enforced by
// Supabase itself (project's auth rate limit config: 30 sign-in/sign-up
// requests per 5 minutes per IP address). See issue #62.
interface AuthCardProps {
  mode: "login" | "signup";
}

export default function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "expired_link"
      ? "That reset link has expired or was already used. Please request a new one."
      : null
  );
  const [info, setInfo] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validation = validateAuthForm(email, password, mode);
    if (!validation.valid || !validation.trimmedEmail) {
      setError(validation.error ?? "Invalid input.");
      return;
    }

    const trimmedEmail = validation.trimmedEmail;
    setLoading(true);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push("/");
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfo(
            "Account created! Please check your email for a confirmation link before logging in."
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Calendar className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isLogin ? "Welcome to Kalend" : "Create an account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin
              ? "Sign in to access your calendar and tasks"
              : "Sign up to start planning your academic schedule"}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-xs text-red-300"
          >
            {error}
          </div>
        )}

        {info && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-blue-950/40 border border-blue-800/60 p-3 text-xs text-blue-300"
          >
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs text-muted-foreground">
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
              className="input input-sm w-full"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-sm w-full"
              required
            />
            {!isLogin && (
              <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_HINT}</p>
            )}
          </div>

          {isLogin && (
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : isLogin ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-border/80 pt-4 text-center text-xs text-muted-foreground">
          {isLogin ? (
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
