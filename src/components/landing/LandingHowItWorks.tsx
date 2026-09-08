// Three-step "how it works" section. Sits between the problem/solution
// comparison and the feature tiles to bridge the why → what → how arc.

interface Step {
  number: string;
  label: string;
  desc: string;
  example: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    number: "01",
    label: "Make a Space for it",
    desc: "Start with the parts of life already taking up room: a class, your job, that project everyone keeps rescheduling.",
    example: "BIO 102 · School",
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
    label: "Add what you don’t want to forget",
    desc: "Put in the lecture, the café shift, and the lab report. Give a task a date when it has one; leave it open when it doesn’t.",
    example: "Lab report · Due Friday",
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
    label: "Let the week be flexible",
    desc: "Drag plans when they move, switch between month, week, and day, or hide a Space when you need to focus on one thing.",
    example: "Work hidden · Study mode",
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
    <section id="how" className="mx-auto grid max-w-[1200px] scroll-mt-8 gap-12 px-6 pb-24 min-[760px]:grid-cols-[0.72fr_1.28fr] min-[860px]:gap-20 min-[860px]:px-8 min-[860px]:pb-32">
      <div className="max-w-[390px]">
        <p className="mb-3 text-sm font-medium text-[var(--kal-muted)]">
          How it works
        </p>
        <h2 className="text-[2rem] leading-[1.12] font-extrabold tracking-[-0.025em] text-[var(--kal-ink)]">
          Start with the week you already have.
        </h2>
        <p className="mt-4 max-w-[330px] text-sm leading-relaxed text-[var(--kal-muted)]">
          No elaborate setup ritual. Just give the things already on your mind somewhere to go.
        </p>
      </div>

      <ol className="border-t border-[var(--kal-border)]">
        {STEPS.map((step, index) => (
          <li
            key={step.number}
            className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-x-4 border-b border-[var(--kal-border)] py-7 min-[860px]:grid-cols-[52px_minmax(0,1fr)_auto] min-[860px]:gap-x-5 ${index === 1 ? "min-[760px]:ml-[18px]" : index === 2 ? "min-[760px]:ml-9" : ""}`}
          >
            <span className="pt-0.5 text-[1.15rem] font-extrabold tracking-[-0.03em] text-[#d8d2c7]">
              {step.number}
            </span>
            <div>
              <p className="mb-1.5 text-base font-bold tracking-[-0.01em] text-[var(--kal-ink)]">
                {step.label}
              </p>
              <p className="text-sm leading-relaxed text-[var(--kal-muted)]">{step.desc}</p>
              <p className="mt-3 w-fit rounded-full bg-[#f5f2eb] px-3 py-1.5 text-[11px] font-medium text-[var(--kal-muted)]">
                {step.example}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-[#fff3e0] text-[var(--kal-accent)]">
              {step.icon}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
