export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--kal-border)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-6 min-[860px]:px-8">
        <span className="text-[13px] text-[var(--kal-muted)]">Built by Edward Rivera</span>
        <span className="text-[var(--kal-border)]" aria-hidden>·</span>
        <a
          href="https://github.com/edwrdrvera"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
        >
          GitHub
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17L17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
        <span className="text-[var(--kal-border)]" aria-hidden>·</span>
        <a
          href="mailto:hello@kalend.app"
          className="text-[13px] text-[var(--kal-muted)] transition-colors hover:text-[var(--kal-ink)]"
        >
          hello@kalend.app
        </a>
      </div>
    </footer>
  );
}
