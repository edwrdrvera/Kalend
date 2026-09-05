// "Problem / Solution" section that sits between the hero and the feature
// tiles. Shows three student pain points on the left, and the Kalend answer
// for each on the right. Uses only standard --kal-* tokens.

interface Point {
  label: string;
  desc: string;
}

const PROBLEMS: Point[] = [
  {
    label: "Deadlines live everywhere",
    desc: "Syllabi, group chats, Canvas, your notes — due dates are scattered across apps you never have open at the same time.",
  },
  {
    label: "Calendar ≠ task list",
    desc: "Your calendar shows events. Your task app shows tasks. Neither knows anything about the other.",
  },
  {
    label: "Surprised by tomorrow",
    desc: "Something is always due sooner than you thought, because nothing showed you the full week at a glance.",
  },
];

const SOLUTIONS: Point[] = [
  {
    label: "One Space per commitment",
    desc: "Every class, project, and job gets its own Space: deadlines, blockers, and reminders all in one place.",
  },
  {
    label: "Tasks and events, together",
    desc: "Kalend puts both in the same calendar view so you never have to cross-reference two separate apps.",
  },
  {
    label: "The week, always in front of you",
    desc: "Filter by Space to see only what's relevant right now. Nothing hides until it's already late.",
  },
];

function XIcon() {
  return (
    <div className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#f0ede6]">
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="var(--kal-muted)"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M2 2 L10 10 M10 2 L2 10" />
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#fed7aa]">
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="var(--kal-accent-hover)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 6 L5 9 L10 3" />
      </svg>
    </div>
  );
}

function ProblemItem({ label, desc }: Point) {
  return (
    <div className="flex gap-3.5 border-b border-[var(--kal-border)] py-4 last:border-none">
      <XIcon />
      <div>
        <p className="text-sm font-semibold text-[var(--kal-muted)]">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--kal-muted)] opacity-75">{desc}</p>
      </div>
    </div>
  );
}

function SolutionItem({ label, desc }: Point) {
  return (
    <div className="flex gap-3.5 border-b border-orange-100 py-4 last:border-none">
      <CheckIcon />
      <div>
        <p className="text-sm font-semibold text-[var(--kal-ink)]">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--kal-muted)]">{desc}</p>
      </div>
    </div>
  );
}

export default function LandingProblemSolution() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24 min-[860px]:px-8 min-[860px]:pb-32">
      <p className="mb-3 text-center text-[11px] font-semibold tracking-[0.12em] text-[var(--kal-muted)] uppercase">
        Why Kalend
      </p>
      <h2 className="mx-auto mb-14 max-w-[520px] text-center text-[2rem] leading-[1.12] font-extrabold tracking-[-0.025em] text-[var(--kal-ink)]">
        Managing student life shouldn&apos;t need five apps.
      </h2>

      <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2">
        {/* Problem tile */}
        <div className="rounded-[18px] border border-[var(--kal-border)] bg-[var(--kal-surface)] p-6 min-[860px]:p-8">
          <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-[var(--kal-muted)] uppercase">
            Right now
          </p>
          {PROBLEMS.map((p) => (
            <ProblemItem key={p.label} label={p.label} desc={p.desc} />
          ))}
        </div>

        {/* Solution tile */}
        <div className="rounded-[18px] border border-orange-200 bg-[#fff7ed] p-6 min-[860px]:p-8">
          <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-[var(--kal-accent)] uppercase">
            With Kalend
          </p>
          {SOLUTIONS.map((s) => (
            <SolutionItem key={s.label} label={s.label} desc={s.desc} />
          ))}
        </div>
      </div>
    </section>
  );
}
