"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import KalendWordmark from "@/components/KalendWordmark";
import LandingButton from "./LandingButton";

const NAV_LINKS = [
  { label: "Why Kalend", href: "#why" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
] as const;

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--kal-border)]/70 bg-[var(--kal-bg)]/88 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-5 px-5 min-[640px]:px-6 min-[860px]:px-8">
        <a href="#top" aria-label="Kalend home" className="shrink-0">
          <KalendWordmark size="sm" tone="ink" animation="scatter" />
        </a>

        {/* Desktop links */}
        <div className="ml-auto hidden items-center gap-7 min-[760px]:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 min-[420px]:gap-2.5">
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
            className="grid size-9 place-items-center rounded-lg text-[var(--kal-muted)] transition-colors hover:bg-[var(--kal-border)]/50 hover:text-[var(--kal-ink)] min-[760px]:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown — slides in below the nav bar */}
      {open && (
        <div className="border-t border-[var(--kal-border)]/70 bg-[var(--kal-bg)] px-5 pb-4 pt-2 min-[760px]:hidden">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={close}
              className="flex h-11 items-center text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
