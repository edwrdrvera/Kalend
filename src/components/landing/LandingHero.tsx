import LandingButton from "./LandingButton";
import WaitlistForm from "./WaitlistForm";
import CalendarMockup from "./CalendarMockup";

export default function LandingHero() {
  return (
    <section id="top" className="relative isolate overflow-hidden border-b border-[var(--kal-border)]/70">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(circle_at_16%_24%,rgba(143,216,200,0.1),transparent_24%),radial-gradient(circle_at_84%_22%,rgba(242,131,107,0.08),transparent_25%)]" aria-hidden />
      <div className="mx-auto flex max-w-[1200px] scroll-mt-24 flex-col items-center px-6 pt-16 pb-20 text-center min-[860px]:px-8 min-[860px]:pt-20 min-[860px]:pb-28">
        <div className="w-full max-w-[920px]">
          <h1
            className="kal-fade-up mx-auto max-w-[900px] text-[clamp(2.7rem,6vw,4.15rem)] leading-[1.02] font-extrabold tracking-[-0.05em] text-[var(--kal-ink)]"
            style={{ animationDelay: "0s" }}
          >
            Make{" "}
            <span className="relative inline-block px-1">
              Space
              <span className="absolute inset-x-0 bottom-1 -z-10 h-[0.23em] rounded-full bg-[#f6c78e]" aria-hidden />
            </span>
            {" "}for the week you actually have.
          </h1>
          <p
            className="kal-fade-up mx-auto mt-6 max-w-[590px] text-base leading-[1.75] text-[var(--kal-muted)] min-[640px]:text-lg"
            style={{ animationDelay: "0.12s" }}
          >
            Classes, shifts, assignments, and everything in between—together on one calendar that&apos;s ready when you are.
          </p>
          <div className="kal-fade-up mx-auto mt-8 w-full max-w-[560px]" style={{ animationDelay: "0.18s" }}>
            <WaitlistForm />
          </div>
          <div
            className="kal-fade-up mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-medium text-[var(--kal-muted)]"
            style={{ animationDelay: "0.24s" }}
          >
            <ProofPoint>Tasks + events together</ProofPoint>
            <ProofPoint>Syncs with your calendar</ProofPoint>
            <span>
              Have demo access?{" "}
              <LandingButton href="/login" variant="secondary" className="ml-1 px-2.5 py-1 text-[11px]">
                Log in
              </LandingButton>
            </span>
          </div>
        </div>

        <div className="kal-fade-up relative mt-9 -mx-6 flex w-[calc(100%+3rem)] justify-center min-[640px]:mx-0 min-[640px]:w-full" style={{ animationDelay: "0.2s" }}>
          <div className="pointer-events-none absolute -top-2 -left-2 z-20 hidden -rotate-3 rounded-lg border border-[#e6d9af] bg-[#fff3bd] px-4 py-3 text-left text-xs text-[#62572f] shadow-[0_7px_18px_rgba(54,43,19,0.1)] min-[900px]:block" aria-hidden>
            <strong className="block">Lab report</strong>
            due Friday
          </div>
          <div className="pointer-events-none absolute top-48 -right-2 z-20 hidden rotate-3 rounded-lg border border-[#cbded9] bg-[#e0f1ec] px-4 py-3 text-left text-xs text-[#365c54] shadow-[0_7px_18px_rgba(28,75,64,0.08)] min-[900px]:block" aria-hidden>
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
        <circle cx="8" cy="8" r="7" fill="#e8f7ef" />
        <path d="m4.75 8 2.1 2.1 4.4-4.45" stroke="#27845d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}
