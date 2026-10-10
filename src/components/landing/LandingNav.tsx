"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import KalendWordmark from "@/components/KalendWordmark";
import { cn } from "@/lib/utils";
import LandingButton from "./LandingButton";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { label: "Why Kalend", id: "why" },
  { label: "Features", id: "features" },
  { label: "How it works", id: "how" },
] as const;

// The menu and close icons crossfade in place with a touch of blur, so the
// swap reads as one icon changing rather than two icons trading places.
const ICON_CLS =
  "absolute inset-0 size-5 transition-[opacity,transform,filter] duration-150 ease-out";
const ICON_HIDDEN = "scale-75 opacity-0 blur-[2px] motion-reduce:scale-100";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior() });
}

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--kal-border)]/70 bg-[var(--kal-bg)]/88 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-5 px-5 min-[640px]:px-6 min-[860px]:px-8">
        <button
          type="button"
          aria-label="Kalend home"
          onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
          className="focus-ring -mx-2 inline-flex shrink-0 items-center rounded-lg px-2 py-2.5"
        >
          <KalendWordmark size="sm" tone="ink" animation="scatter" />
        </button>

        {/* Desktop links */}
        <div className="ml-auto hidden items-center gap-7 min-[760px]:flex">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="focus-ring rounded-md px-1 py-2.5 text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 min-[420px]:gap-2.5">
          <ThemeToggle />
          <LandingButton href="/login" variant="secondary" className="hidden min-[420px]:inline-flex">
            Log in
          </LandingButton>
          {/* Scrolls to the email form in LandingHero, id="waitlist". There's
              no signup route in this MVP (see src/app/CLAUDE.md). */}
          <LandingButton href="#waitlist" variant="primary" className="px-4 min-[420px]:px-[22px]">
            Join waitlist
          </LandingButton>

          {/* Mobile menu toggle — only visible below 760px where desktop links are hidden */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="focus-ring grid size-10 place-items-center rounded-lg text-[var(--kal-muted)] transition-colors hover:bg-[var(--kal-border)]/50 hover:text-[var(--kal-ink)] min-[760px]:hidden"
          >
            <span className="relative size-5">
              <Menu className={cn(ICON_CLS, open && ICON_HIDDEN)} />
              <X className={cn(ICON_CLS, !open && ICON_HIDDEN)} />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown: stays mounted so it can fade, and is taken out of the
          tab order and the page flow while closed. Closing is faster than opening. */}
      <div
        inert={!open}
        className={cn(
          "absolute inset-x-0 top-full border-b border-[var(--kal-border)]/70 bg-[var(--kal-bg)] px-5 pb-4 pt-2 transition-[opacity,transform,visibility] ease-out min-[760px]:hidden motion-reduce:translate-y-0",
          open ? "visible translate-y-0 opacity-100 duration-150" : "invisible -translate-y-1 opacity-0 duration-100"
        )}
      >
        {NAV_LINKS.map(({ label, id }) => (
          <button
            key={id}
            type="button"
            onClick={() => { scrollTo(id); close(); }}
            className="focus-ring flex h-11 w-full items-center rounded-md text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  );
}
