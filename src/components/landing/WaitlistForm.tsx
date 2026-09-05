"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "./landing-button-variants";

// Public, unauthenticated email capture for the MVP. There's no signup
// flow (see src/app/CLAUDE.md): this posts to /api/waitlist, which just
// stores the email, no account created. Rendered from LandingHero.
export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p id="waitlist" className="kal-fade-up text-sm font-medium text-[var(--kal-ink)]">
        You&apos;re on the list! We&apos;ll email you when Kalend is ready.
      </p>
    );
  }

  return (
    <div id="waitlist" className="flex w-full flex-col items-center gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-stretch gap-3 min-[860px]:w-auto min-[860px]:flex-row min-[860px]:items-center"
      >
        <input
          type="email"
          name="email"
          placeholder="you@university.edu"
          aria-label="Email address"
          required
          disabled={status === "loading"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[10px] border border-[var(--kal-border)] bg-white px-4 py-3 text-[15px] text-[var(--kal-ink)] placeholder:text-[var(--kal-muted)] focus:border-[var(--kal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kal-accent)]/25 disabled:opacity-60 min-[860px]:w-[280px]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(landingButtonVariants({ variant: "primary", size: "hero" }), "justify-center")}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Joining...
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
      </form>
      {error && <p className="text-sm text-[var(--kal-cat-red)]">{error}</p>}
    </div>
  );
}
