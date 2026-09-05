"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PASSWORD_REQUIREMENTS_HINT, validateAuthForm } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "@/components/landing/landing-button-variants";
import AuthCardShell, {
  authInputClassName,
  authLabelClassName,
  authLinkClassName,
} from "./AuthCardShell";

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

        router.push("/app");
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
          router.push("/app");
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
    <AuthCardShell
      title={isLogin ? "Welcome to Kalend" : "Create an account"}
      subtitle={
        isLogin
          ? "Sign in to access your calendar and tasks"
          : "Sign up to start planning your academic schedule"
      }
      error={error}
      info={info}
      footer={
        isLogin ? (
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className={authLinkClassName}>
              Sign up
            </Link>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <Link href="/login" className={authLinkClassName}>
              Sign in
            </Link>
          </p>
        )
      }
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
            autoComplete={isLogin ? "current-password" : "new-password"}
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName}
            required
          />
          {!isLogin && <p className={authLabelClassName}>{PASSWORD_REQUIREMENTS_HINT}</p>}
        </div>

        {isLogin && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className={cn(authLabelClassName, "hover:text-[var(--kal-primary)] hover:underline underline-offset-4")}>
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(landingButtonVariants({ variant: "primary" }), "w-full")}
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
    </AuthCardShell>
  );
}
