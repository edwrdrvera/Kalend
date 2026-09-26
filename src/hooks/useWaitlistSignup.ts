"use client";

import { useState } from "react";

interface WaitlistResponse {
  success?: boolean;
  error?: string;
}

type SignupState =
  | { status: "idle" | "loading" | "done" }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function useWaitlistSignup() {
  const [state, setState] = useState<SignupState>({ status: "idle" });

  async function join(email: string, website: string): Promise<void> {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const json = (await response.json().catch(() => null)) as WaitlistResponse | null;

      if (response.status === 429) {
        setState({ status: "error", message: "Too many attempts. Please wait 10 minutes and try again." });
      } else if (!response.ok || !json?.success) {
        setState({ status: "error", message: json?.error ?? GENERIC_ERROR });
      } else {
        setState({ status: "done" });
      }
    } catch {
      setState({ status: "error", message: GENERIC_ERROR });
    }
  }

  return {
    status: state.status,
    error: state.status === "error" ? state.message : null,
    join,
  };
}
