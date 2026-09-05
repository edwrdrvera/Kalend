"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { landingButtonVariants } from "./landing-button-variants";

// Waitlist CTA for the landing hero. The email input has been removed in
// favour of a single-click button; wiring up a proper email-capture tool
// (Tally, Typeform, etc.) is tracked in docs/landing-page-handoff.md.
export default function WaitlistForm() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    // Brief delay gives the click a sense of weight before confirming.
    setTimeout(() => {
      setDone(true);
      setLoading(false);
    }, 380);
  }

  if (done) {
    return (
      <p id="waitlist" className="kal-fade-up text-sm font-medium text-[var(--kal-ink)]">
        You&apos;re on the list! We&apos;ll be in touch soon.
      </p>
    );
  }

  return (
    <div id="waitlist" className="flex w-full items-center justify-center min-[860px]:w-auto">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(landingButtonVariants({ variant: "primary", size: "hero" }), "justify-center")}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Joining&hellip;
          </>
        ) : (
          "Join the waitlist"
        )}
      </button>
    </div>
  );
}
