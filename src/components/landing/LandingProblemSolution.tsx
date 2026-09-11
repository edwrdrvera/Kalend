interface Point {
  label: string;
  desc: string;
}

const PROBLEMS: Point[] = [
  {
    label: "“Wait, that was due today?”",
    desc: "The date was in the syllabus. The reminder was in the group chat. Somehow neither made it into your week.",
  },
  {
    label: "Your shift moved. Again.",
    desc: "Now work overlaps the study block you planned around a class that already ran late.",
  },
  {
    label: "Your brain became the backup system",
    desc: "You are carrying every loose task in your head, even when you are meant to be off the clock.",
  },
];

const SOLUTIONS: Point[] = [
  {
    label: "Give everything a home",
    desc: "BIO 102, the café, and your group project each get a Space for their events and tasks.",
  },
  {
    label: "See the paper beside the shift",
    desc: "Tasks and events share one calendar, so your plans reflect the day you actually have.",
  },
  {
    label: "Make a little room to think",
    desc: "Hide a Space when you need less noise, then bring it back when you are ready for it.",
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
    <section id="why" className="mx-auto max-w-[1200px] scroll-mt-24 px-6 py-24 min-[860px]:px-8 min-[860px]:py-32">
      <div className="mb-12 max-w-[540px]">
        <p className="mb-3 text-sm font-medium text-[var(--kal-muted)]">
          Why Kalend
        </p>
        <h2 className="text-[2rem] leading-[1.12] font-extrabold tracking-[-0.025em] text-[var(--kal-ink)]">
          Your week is already doing a lot.
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 min-[760px]:grid-cols-[0.78fr_1.22fr]">
        <div className="rounded-[18px] border border-[var(--kal-border)] bg-[#f8f6f1] p-5 min-[760px]:mt-12 min-[860px]:p-6">
          <p className="mb-1 text-xs font-medium text-[var(--kal-muted)]">
            The usual setup
          </p>
          {PROBLEMS.map((problem) => (
            <ProblemItem key={problem.label} label={problem.label} desc={problem.desc} />
          ))}
        </div>

        <div className="rounded-[22px] border border-[#f0e1d2] bg-[#fffbf6] p-6 min-[860px]:p-9">
          <p className="mb-1 text-xs font-medium text-[var(--kal-accent)]">
            The calmer version
          </p>
          <h3 className="mt-3 mb-4 max-w-[420px] text-[1.45rem] leading-tight font-bold tracking-[-0.025em] text-[var(--kal-ink)]">
            One honest view of the week you actually have.
          </h3>
          {SOLUTIONS.map((solution) => (
            <SolutionItem key={solution.label} label={solution.label} desc={solution.desc} />
          ))}
        </div>
      </div>
    </section>
  );
}
