"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateAuthForm } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const validation = validateAuthForm(email, password);
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
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-[#191919] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md">
            <Calendar className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            {isLogin ? "Welcome to Kalend" : "Create an account"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
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
            <Label htmlFor="email" className="text-xs text-neutral-300">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-neutral-800 bg-[#121212] text-neutral-100 placeholder:text-neutral-500 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-neutral-300">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-neutral-800 bg-[#121212] text-neutral-100 placeholder:text-neutral-500 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : isLogin ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <div className="mt-6 border-t border-neutral-800/80 pt-4 text-center text-xs text-neutral-400">
          {isLogin ? (
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
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
