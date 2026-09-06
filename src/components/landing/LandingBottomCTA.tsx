// Final CTA section above the footer. Links back to the hero form rather
// than carrying its own form, so email capture has one source of truth.
import LandingButton from "./LandingButton";

export default function LandingBottomCTA() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20 min-[860px]:px-8 min-[860px]:pb-28">
      <div className="flex flex-col items-center rounded-[24px] bg-[var(--kal-ink)] px-8 py-14 text-center min-[860px]:py-20">
        <h2 className="mx-auto max-w-[520px] text-[2rem] leading-[1.1] font-extrabold tracking-[-0.025em] text-white">
          Your most organised semester starts here.
        </h2>
        <p className="mt-4 max-w-[400px] text-base leading-relaxed text-white/65">
          Be the first to know when Kalend opens up.
        </p>
        <LandingButton
          href="#waitlist"
          variant="primary"
          size="hero"
          className="mt-8"
        >
          Join the waitlist
        </LandingButton>
      </div>
    </section>
  );
}
