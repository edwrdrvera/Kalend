"use client";

import { useState } from "react";

interface WaitlistResponse {
  success?: boolean;
  error?: string;
}

export type WaitlistStatus = "idle" | "loading" | "done" | "error";

export function useWaitlistSignup() {
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function join(email: string, website: string): Promise<void> {
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

  return { status, error, join };
}
