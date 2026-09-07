import KalendWordmark from "@/components/KalendWordmark";
import LandingButton from "./LandingButton";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--kal-border)]/70 bg-[var(--kal-bg)]/88 backdrop-blur-xl">
      <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-5 px-5 min-[640px]:px-6 min-[860px]:px-8">
        <a href="#top" aria-label="Kalend home" className="shrink-0">
          <KalendWordmark size="sm" tone="ink" animation="scatter" />
        </a>
        <div className="ml-auto hidden items-center gap-7 min-[760px]:flex">
          <a className="text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]" href="#why">
            Why Kalend
          </a>
          <a className="text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]" href="#features">
            Features
          </a>
          <a className="text-sm font-medium text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]" href="#how">
            How it works
          </a>
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
        </div>
      </nav>
    </header>
  );
}
