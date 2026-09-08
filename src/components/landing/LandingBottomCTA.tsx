// Final CTA section above the footer. Links back to the hero form rather
// than carrying its own form, so email capture has one source of truth.
import LandingButton from "./LandingButton";

export default function LandingBottomCTA() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20 min-[860px]:px-8 min-[860px]:pb-28">
      <div className="grid items-center gap-8 rounded-[22px] border border-[var(--kal-border)] bg-white/55 px-7 py-9 min-[700px]:grid-cols-[1.1fr_0.9fr] min-[860px]:px-10 min-[860px]:py-10">
        <div>
          <p className="mb-3 text-xs font-medium text-[var(--kal-muted)]">
            Get early access
          </p>
          <h2 className="max-w-[520px] text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.08] font-extrabold tracking-[-0.035em] text-[var(--kal-ink)]">
            Your week doesn&apos;t need to live in your head.
          </h2>
        </div>
        <div>
          <p className="max-w-[360px] text-sm leading-relaxed text-[var(--kal-muted)]">
            Join the waitlist and we&apos;ll let you know when your Kalend Space is ready.
          </p>
          <LandingButton href="#waitlist" variant="primary" className="mt-5">
            Join the waitlist
          </LandingButton>
        </div>
      </div>
    </section>
  );
}
