import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import KalendMark from "./KalendMark";

// AuthCard (login, the only auth flow left in this MVP) renders this shell
// so it reads as part of the same brand as the landing page
// (src/app/(marketing)/), not the app's own dark theme: light --kal-*
// tokens and Plus Jakarta Sans, loaded here rather than depending on a
// route-group layout, since the page stays under (app)'s dark root.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-kalend-auth",
});

interface AuthCardShellProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: React.ReactNode;
}

export default function AuthCardShell({ title, subtitle, error, children }: AuthCardShellProps) {
  return (
    <div
      className={cn(
        plusJakartaSans.variable,
        "font-[family-name:var(--font-kalend-auth)]",
        "flex min-h-screen w-full items-center justify-center bg-[var(--kal-bg)] px-4 py-12"
      )}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--kal-border)] bg-[var(--kal-surface)] p-8 shadow-[0_20px_48px_-24px_rgba(28,26,22,0.18)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <KalendMark size={40} tone="ink" label="Kalend" className="mb-4" />
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--kal-ink)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--kal-muted)]">{subtitle}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] border border-[var(--kal-cat-red)]/30 bg-[var(--kal-cat-red-tint)] p-3 text-xs text-[var(--kal-cat-red)]"
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
  "w-full rounded-[10px] border border-[var(--kal-border)] bg-white px-3 py-2 text-sm text-[var(--kal-ink)] placeholder:text-[var(--kal-muted)] focus:border-[var(--kal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--kal-accent)]/25 disabled:opacity-60";

export const authLabelClassName = "text-xs text-[var(--kal-muted)]";
