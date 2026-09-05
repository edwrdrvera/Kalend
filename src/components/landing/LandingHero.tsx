import LandingButton from "./LandingButton";
import WaitlistForm from "./WaitlistForm";
import CalendarMockup from "./CalendarMockup";

export default function LandingHero() {
  return (
    <section className="mx-auto flex max-w-[1200px] flex-col items-center px-6 pt-16 pb-20 text-center min-[860px]:px-8 min-[860px]:pt-[88px] min-[860px]:pb-28">
      <h1
        className="kal-fade-up max-w-[760px] text-[2.25rem] leading-[1.05] font-extrabold tracking-[-0.03em] min-[860px]:text-[clamp(2.6rem,5.4vw,4rem)]"
        style={{ animationDelay: "0s" }}
      >
        Hey, let&apos;s get your week sorted.
      </h1>
      <p
        className="kal-fade-up mt-5 max-w-[580px] text-lg leading-relaxed text-[var(--kal-muted)]"
        style={{ animationDelay: "0.1s" }}
      >
        Group deadlines, blockers, and reminders into Spaces — a class, a project, a job,
        anything with its own due dates. Then sync it all with Google or Apple Calendar.
      </p>
      <div className="kal-fade-up mt-7 w-full min-[860px]:w-auto" style={{ animationDelay: "0.2s" }}>
        <WaitlistForm />
      </div>
      <div
        className="kal-fade-up mt-3 flex items-center gap-1 text-[13px] text-[var(--kal-muted)]"
        style={{ animationDelay: "0.24s" }}
      >
        Have the demo account?{" "}
        <LandingButton href="/login" variant="secondary" className="ml-1 px-3 py-1.5 text-xs">
          Log in
        </LandingButton>
      </div>
      <div
        className="kal-fade-up mt-[18px] flex items-center gap-[7px] text-[13px] text-[var(--kal-muted)]"
        style={{ animationDelay: "0.26s" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M17 2.1l4 4-4 4" />
          <path d="M3 12.7V12a9 9 0 019-9h9" />
          <path d="M7 21.9l-4-4 4-4" />
          <path d="M21 11.3V12a9 9 0 01-9 9H3" />
        </svg>
        Syncs with Google &amp; Apple Calendar
      </div>

      <div className="kal-fade-up mt-14 flex w-full justify-center" style={{ animationDelay: "0.32s" }}>
        <CalendarMockup />
      </div>
    </section>
  );
}
