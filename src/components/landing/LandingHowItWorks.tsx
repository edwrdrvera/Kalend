// Three-step "how it works" section. Sits between the problem/solution
// comparison and the feature tiles to bridge the why → what → how arc.

interface Step {
  number: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    number: "01",
    label: "Create a Space",
    desc: "Give every class, project, and job its own Space. Spaces hold all the deadlines, tasks, and reminders for that one commitment — nothing bleeds into anything else.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M17.5 14 L17.5 21 M14 17.5 L21 17.5" />
      </svg>
    ),
  },
  {
    number: "02",
    label: "Add your deadlines",
    desc: "Drop in due dates, exams, blockers, and reminders directly in the calendar. Tag the type and urgency so you always know what needs attention first.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 2 L8 6 M16 2 L16 6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M9 16 L11.5 18.5 L15.5 13.5" />
      </svg>
    ),
  },
  {
    number: "03",
    label: "See your week clearly",
    desc: "Filter by Space to focus on exactly what's relevant right now. Kalend syncs everything to Google or Apple Calendar so your week is always one place away.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7 L12 12 L15.5 15.5" />
        <path d="M5 5 L3 3 M19 5 L21 3" />
      </svg>
    ),
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24 min-[860px]:px-8 min-[860px]:pb-32">
      <p className="mb-3 text-center text-[11px] font-semibold tracking-[0.12em] text-[var(--kal-muted)] uppercase">
        How it works
      </p>
      <h2 className="mx-auto mb-14 max-w-[480px] text-center text-[2rem] leading-[1.12] font-extrabold tracking-[-0.025em] text-[var(--kal-ink)]">
        Up and running in three steps.
      </h2>

      <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-4 rounded-[18px] border border-[var(--kal-border)] bg-[var(--kal-surface)] p-6 min-[860px]:p-8"
          >
            {/* Number + icon row */}
            <div className="flex items-center justify-between">
              <span className="text-[2.5rem] font-extrabold leading-none tracking-[-0.04em] text-[#ede9e0]">
                {step.number}
              </span>
              <div className="flex size-[42px] items-center justify-center rounded-[12px] bg-[#fff3e0] text-[var(--kal-accent)]">
                {step.icon}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-base font-bold tracking-[-0.01em] text-[var(--kal-ink)]">
                {step.label}
              </p>
              <p className="text-sm leading-relaxed text-[var(--kal-muted)]">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
