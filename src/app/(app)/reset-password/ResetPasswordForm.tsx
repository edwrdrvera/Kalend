"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword, PASSWORD_REQUIREMENTS_HINT } from "@/lib/auth-validation";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "@/components/landing/landing-button-variants";
import AuthCardShell, { authInputClassName, authLabelClassName } from "@/components/AuthCardShell";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push("/app");
      router.refresh();
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
      title="Set a new password"
      subtitle="Choose a new password for your account"
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className={authLabelClassName}>
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClassName}
            required
          />
          <p className={authLabelClassName}>{PASSWORD_REQUIREMENTS_HINT}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className={authLabelClassName}>
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={loading}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
              Saving...
            </>
          ) : (
            "Save new password"
          )}
        </button>
      </form>
    </AuthCardShell>
  );
}
