"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "./landing-button-variants";

interface WaitlistResponse {
  success?: boolean;
  error?: string;
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const json = (await response.json().catch(() => null)) as WaitlistResponse | null;

      if (response.status === 429) {
        setError("Too many attempts. Please wait 10 minutes and try again.");
        setStatus("error");
        return;
      }

      if (!response.ok || !json?.success) {
        setError(json?.error ?? "Something went wrong. Please try again.");
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
      <p
        id="waitlist"
        role="status"
        className="kal-fade-up text-sm font-medium text-[var(--kal-ink)]"
      >
        You’re on the list. We’ll be in touch with Kalend launch and access updates.
      </p>
    );
  }

  return (
    <div id="waitlist" className="flex w-full flex-col items-center gap-2 min-[960px]:items-start">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-stretch gap-3 min-[560px]:flex-row min-[560px]:items-center"
      >
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          placeholder="you@university.edu"
          autoComplete="email"
          required
          disabled={status === "loading"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby="waitlist-consent waitlist-error"
          className="min-w-0 flex-1 rounded-[10px] border border-[var(--kal-border)] bg-white px-4 py-3 text-[15px] text-[var(--kal-ink)] shadow-sm placeholder:text-[var(--kal-muted)] focus:border-[var(--kal-accent)] focus:ring-2 focus:ring-[var(--kal-accent)]/25 focus:outline-none disabled:opacity-60"
        />
        <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="waitlist-website">Website</label>
          <input
            id="waitlist-website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            landingButtonVariants({ variant: "primary", size: "hero" }),
            "justify-center disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Joining&hellip;
            </>
          ) : (
            "Join the waitlist"
          )}
        </button>
      </form>
      <p id="waitlist-consent" className="text-xs text-[var(--kal-muted)]">
        We’ll use your email only to send Kalend launch and access updates.
      </p>
      {error && (
        <p id="waitlist-error" role="alert" className="text-sm text-[var(--kal-cat-red)]">
          {error}
        </p>
      )}
    </div>
  );
}
