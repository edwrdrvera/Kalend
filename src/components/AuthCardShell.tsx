import KalendMark from "./KalendMark";

interface AuthCardShellProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: React.ReactNode;
}

export default function AuthCardShell({ title, subtitle, error, children }: AuthCardShellProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--kal-bg)] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--kal-border)] bg-[var(--kal-surface)] p-8 shadow-[0_20px_48px_-24px_rgba(28,26,22,0.18)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <KalendMark size={40} tone="ink" label="Kalend" className="mb-4" />
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--kal-ink)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--kal-muted)]">{subtitle}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

// Shared input styling for AuthCard's fields.
export const authInputClassName =
  "w-full rounded-[10px] border border-[var(--kal-border)] bg-[var(--kal-surface)] px-3 py-2 text-sm text-[var(--kal-ink)] placeholder:text-[var(--kal-muted)] focus:border-[var(--kal-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kal-primary)]/25 disabled:opacity-60";

export const authLabelClassName = "text-xs text-[var(--kal-muted)]";
