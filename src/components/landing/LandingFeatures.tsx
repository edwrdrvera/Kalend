export default function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] scroll-mt-8 px-6 pb-24 min-[860px]:px-8 min-[860px]:pb-32">
      <p className="mb-3 text-center text-sm font-medium text-[var(--kal-muted)]">
        What changes with Kalend
      </p>
      <h2 className="mx-auto max-w-[520px] text-center text-[2rem] leading-[1.12] font-extrabold tracking-[-0.025em] text-[var(--kal-ink)]">
        Your brain isn&apos;t a calendar app.
      </h2>
      <p className="mx-auto mt-4 mb-12 max-w-[560px] text-center text-sm leading-relaxed text-[var(--kal-muted)]">
        The assignment in your notes. The shift in your messages. The deadline you almost forgot.
        <strong className="mt-1 block font-semibold text-[var(--kal-ink)]">Give them one place to land.</strong>
      </p>

      <div className="grid grid-cols-1 gap-3.5 min-[640px]:grid-cols-2">
        <article className="relative isolate flex min-h-[440px] flex-col overflow-hidden rounded-[18px] bg-[var(--kal-tile-mint)] p-7 text-[var(--kal-tile-ink)] min-[860px]:p-8">
          <span
            className="pointer-events-none absolute -top-12 -right-12 h-36 w-56 -rotate-6 bg-[#eef5df]/65"
            style={{ clipPath: "polygon(7% 18%, 100% 0, 92% 86%, 24% 100%, 0 67%)" }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -bottom-7 -left-9 h-28 w-40 rotate-6 bg-[#f6edcf]/45"
            style={{ clipPath: "polygon(0 10%, 86% 0, 100% 72%, 22% 100%)" }}
            aria-hidden
          />
          <span className="pointer-events-none absolute top-7 right-7 h-px w-28 -rotate-6 bg-white/60" aria-hidden />
          <FeatureIcon kind="spaces" />
          <p className="mt-7 text-sm font-medium opacity-65">01 · Give it a Space</p>
          <h3 className="mt-2 text-[1.7rem] leading-[1.08] font-extrabold tracking-[-0.025em]">
            A place for every<br />part of your life.
          </h3>
          <p className="mt-3 max-w-[440px] text-sm leading-[1.55] opacity-75">
            Make a Space for each class, project, or job. Its tasks and events stay together, with a color you can spot at a glance.
          </p>
          <div className="mt-auto translate-y-7 rounded-t-[14px] bg-white/90 px-5 py-3 shadow-[0_12px_30px_rgba(23,19,16,0.08)] min-[860px]:translate-y-8">
            <SpaceRow color="#3b82f6" label="BIO 102" detail="Class" />
            <SpaceRow color="#f97316" label="Campus café" detail="Work" />
            <SpaceRow color="#a855f7" label="Design project" detail="Project" />
          </div>
        </article>

        <article className="relative isolate flex min-h-[440px] flex-col overflow-hidden rounded-[18px] bg-[var(--kal-tile-coral)] p-7 text-[var(--kal-tile-ink)] min-[860px]:p-8">
          <span
            className="pointer-events-none absolute -top-10 -left-10 h-28 w-52 rotate-[-8deg] bg-[#ffe9cf]/55"
            style={{ clipPath: "polygon(0 12%, 94% 0, 100% 67%, 18% 100%)" }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -right-12 -bottom-9 h-40 w-48 rotate-3 bg-[#fff0d9]/50"
            style={{ clipPath: "polygon(18% 0, 100% 14%, 86% 100%, 0 78%)" }}
            aria-hidden
          />
          <span className="pointer-events-none absolute top-5 left-5 h-px w-32 -rotate-6 bg-white/55" aria-hidden />
          <FeatureIcon kind="tasks" />
          <p className="mt-7 text-sm font-medium opacity-65">02 · See the whole picture</p>
          <h3 className="mt-2 text-[1.7rem] leading-[1.08] font-extrabold tracking-[-0.025em]">
            Deadlines meet<br />your actual day.
          </h3>
          <p className="mt-3 max-w-[440px] text-sm leading-[1.55] opacity-75">
            Put tasks beside your events. Add a due date when there is one. Leave it off when “sometime this week” is the plan.
          </p>
          <div className="mt-auto translate-y-7 rounded-t-[14px] bg-white/90 px-5 pt-4 pb-5 shadow-[0_12px_30px_rgba(23,19,16,0.08)] min-[860px]:translate-y-8">
            <p className="mb-2 text-xs font-medium opacity-55">
              Wednesday, September 9
            </p>
            <div className="flex items-center gap-2 border-t border-black/10 py-2.5 text-xs">
              <span className="size-2 rounded-[2px] bg-[#3b82f6]" aria-hidden />
              <strong>Biology lecture</strong>
              <span className="ml-auto">9 am</span>
            </div>
            <TaskRow label="Finish lab report" detail="Due today" urgent />
            <TaskRow label="Read chapter 4" detail="No due date" />
          </div>
        </article>
      </div>
    </section>
  );
}

function FeatureIcon({ kind }: { kind: "spaces" | "tasks" }) {
  return (
    <div className="flex size-[38px] items-center justify-center rounded-[10px] bg-white/55">
      {kind === "spaces" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )}
    </div>
  );
}

function SpaceRow({ color, label, detail }: { color: string; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 text-xs min-[860px]:text-sm">
      <span className="size-2 rounded-[2px]" style={{ background: color }} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="ml-auto opacity-55">{detail}</span>
    </div>
  );
}

function TaskRow({ label, detail, urgent = false }: { label: string; detail: string; urgent?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-t border-black/10 py-2.5 text-xs">
      <span className="size-3.5 rounded-[3px] border border-black/40" aria-hidden />
      <span>{label}</span>
      <span className={urgent ? "ml-auto rounded bg-orange-100 px-1.5 py-0.5" : "ml-auto opacity-55"}>{detail}</span>
    </div>
  );
}
