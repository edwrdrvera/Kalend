import Link from "next/link";
import WaitlistForm from "./WaitlistForm";
import CalendarMockup from "./CalendarMockup";

export default function LandingHero() {
  return (
    <section id="top" className="relative isolate overflow-hidden border-b border-[var(--kal-border)]/70">
      <div className="mx-auto flex max-w-[1200px] scroll-mt-24 flex-col items-center px-6 pt-16 pb-20 text-center min-[860px]:px-8 min-[860px]:pt-20 min-[860px]:pb-28">
        <div className="w-full max-w-[920px]">
          <h1
            className="kal-fade-up mx-auto max-w-[900px] text-[clamp(2.7rem,6vw,4.15rem)] leading-[1.02] font-extrabold tracking-[-0.05em] text-[var(--kal-ink)]"
            style={{ animationDelay: "0s" }}
          >
            Make{" "}
            <span className="relative inline-block px-1">
              Space
              <span className="absolute inset-x-0 bottom-1 -z-10 h-[0.23em] rounded-full bg-[var(--kal-tile-mustard)]/70" aria-hidden />
            </span>
            {" "}for the week you actually have.
          </h1>
          <p
            className="kal-fade-up mx-auto mt-6 max-w-[590px] text-base leading-[1.75] text-[var(--kal-muted)] min-[640px]:text-lg"
            style={{ animationDelay: "0.06s" }}
          >
            Classes, shifts, assignments, and everything in between—together on one calendar that&apos;s ready when you are.
          </p>
          <div className="kal-fade-up mx-auto mt-8 w-full max-w-[560px]" style={{ animationDelay: "0.12s" }}>
            <WaitlistForm />
          </div>
          <div
            className="kal-fade-up mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-medium text-[var(--kal-muted)]"
            style={{ animationDelay: "0.18s" }}
          >
            <ProofPoint>Tasks + events together</ProofPoint>
            <ProofPoint>Calendar sync coming soon</ProofPoint>
            <span>
              Have demo access?{" "}
              <Link
                href="/login"
                className="focus-ring -my-2 inline-block rounded-sm px-1 py-2 font-semibold text-[var(--kal-ink)] underline underline-offset-2 transition-colors hover:text-[var(--kal-accent-hover)]"
              >
                Log in
              </Link>
            </span>
          </div>
        </div>

        <div className="kal-fade-up relative mt-9 -mx-6 flex w-[calc(100%+3rem)] justify-center min-[640px]:mx-0 min-[640px]:w-full" style={{ animationDelay: "0.24s" }}>
          <div className="pointer-events-none absolute -top-2 -left-2 z-20 hidden -rotate-3 rounded-lg border border-[var(--kal-tile-mustard)]/50 bg-[var(--kal-cat-yellow-tint)] px-4 py-3 text-left text-xs text-[var(--kal-ink)] shadow-[0_7px_18px_color-mix(in_srgb,var(--kal-tile-ink)_10%,transparent)] min-[900px]:block" aria-hidden>
            <strong className="block">Lab report</strong>
            due Friday
          </div>
          <div className="pointer-events-none absolute top-48 -right-2 z-20 hidden rotate-3 rounded-lg border border-[var(--kal-tile-mint)] bg-[var(--kal-cat-teal-tint)] px-4 py-3 text-left text-xs text-[var(--kal-ink)] shadow-[0_7px_18px_color-mix(in_srgb,var(--kal-tile-ink)_8%,transparent)] min-[900px]:block" aria-hidden>
            <strong className="block">Café shift</strong>
            4–8 pm
          </div>
          <CalendarMockup />
        </div>
      </div>
    </section>
  );
}

function ProofPoint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="var(--kal-cat-green-tint)" />
        <path d="m4.75 8 2.1 2.1 4.4-4.45" stroke="var(--kal-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}
