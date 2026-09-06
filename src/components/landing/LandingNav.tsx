import KalendWordmark from "@/components/KalendWordmark";
import LandingButton from "./LandingButton";

export default function LandingNav() {
  return (
    <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 min-[860px]:px-8">
      <KalendWordmark size="sm" tone="ink" animation="scatter" />
      <div className="flex items-center gap-2.5">
        <LandingButton href="/login" variant="secondary">
          Log In
        </LandingButton>
        {/* Scrolls to the email form in LandingHero, id="waitlist". There's
            no signup route in this MVP (see src/app/CLAUDE.md). */}
        <LandingButton href="#waitlist" variant="primary">
          Join Waitlist
        </LandingButton>
      </div>
    </nav>
  );
}
