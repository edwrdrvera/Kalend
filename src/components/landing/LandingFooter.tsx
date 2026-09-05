export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--kal-border)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-6 min-[860px]:px-8">
        <span className="text-[13px] text-[var(--kal-muted)]">
          &copy; {new Date().getFullYear()} Kalend
        </span>
        <span className="text-[var(--kal-border)]" aria-hidden>·</span>
        <a
          href="mailto:hello@kalend.app"
          className="text-[13px] text-[var(--kal-muted)] hover:text-[var(--kal-ink)] transition-colors"
        >
          hello@kalend.app
        </a>
      </div>
    </footer>
  );
}
