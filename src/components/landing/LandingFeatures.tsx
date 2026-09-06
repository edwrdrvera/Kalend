interface Feature {
  title: string;
  description: string;
  tile: string;
  large?: boolean;
  icon: React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "A Space for everything you're juggling",
    description:
      "A class, a project, a job — each gets its own Space to hold deadlines, blockers, and reminders. Toggle its schedule off when you just want a clean calendar.",
    tile: "var(--kal-tile-mint)",
    large: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--kal-tile-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "Deadlines, prioritized",
    description: "Tag what type it is, how urgent it is, and never lose track.",
    tile: "var(--kal-tile-mustard)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--kal-tile-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="8" r="1.4" fill="var(--kal-tile-ink)" stroke="none" />
        <circle cx="8.2" cy="13.5" r="1.4" fill="var(--kal-tile-ink)" stroke="none" />
        <circle cx="15.8" cy="13.5" r="1.4" fill="var(--kal-tile-ink)" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Always in sync",
    description: "Google or Apple Calendar — pick one, we'll keep it updated.",
    tile: "var(--kal-tile-coral)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--kal-tile-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12.7V12a9 9 0 019-9h9" />
        <path d="M7 21.9l-4-4 4-4" />
        <path d="M21 11.3V12a9 9 0 01-9 9H3" />
      </svg>
    ),
  },
];

export default function LandingFeatures() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-24 min-[860px]:px-8 min-[860px]:pb-32">
      <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex min-w-0 flex-col gap-3 rounded-[18px] p-7 text-[var(--kal-tile-ink)]"
            style={{ background: feature.tile, gridColumn: feature.large ? "1 / -1" : undefined }}
          >
            <div className="flex size-[38px] items-center justify-center rounded-[10px] bg-white/55">
              {feature.icon}
            </div>
            <div className="text-lg font-bold tracking-[-0.01em]">{feature.title}</div>
            <div className="max-w-[480px] text-sm leading-[1.55] opacity-[0.72]">{feature.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
