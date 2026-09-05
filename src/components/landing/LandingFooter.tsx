export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--kal-border)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-center gap-2 px-6 py-6 min-[860px]:px-8">
        <span className="text-[13px] text-[var(--kal-muted)]">Built by Edward Rivera</span>
        <a
          href="https://github.com/edwrdrvera"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--kal-primary)] hover:underline"
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17L17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
