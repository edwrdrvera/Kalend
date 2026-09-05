import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import KalendMark from "./KalendMark";

// AuthCard (login, the only auth flow left in this MVP) renders this shell
// so it reads as part of the same brand as the landing page
// (src/app/(marketing)/), not the app's own dark theme: light --kal-*
// tokens and Plus Jakarta Sans, loaded here rather than depending on a
// route-group layout, since the page stays under (app)'s dark root.
//
// Token strategy: use the app's own CSS variables (--background, --card,
// --border, --foreground, --muted-foreground, --primary) rather than the
// --kal-* landing tokens, because the app tokens already carry both light
// and dark values, and the light-mode values are identical to --kal-* anyway
// (both were set to the same warm palette when #100 shipped). This gives
// dark-mode support for free.
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
        "flex min-h-screen w-full items-center justify-center bg-background px-4 py-12"
      )}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-[0_20px_48px_-24px_rgba(28,26,22,0.18)] dark:shadow-[0_20px_48px_-24px_rgba(0,0,0,0.4)]">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* Two marks: one for each mode, toggled via the .dark class on <html>.
              Avoids client-component logic while remaining flash-free, since the
              no-flash script in (app)/layout.tsx sets .dark before first paint. */}
          <KalendMark size={40} tone="ink" label="Kalend" className="mb-4 dark:hidden" />
          <KalendMark size={40} tone="white" label="Kalend" className="mb-4 hidden dark:block" />
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
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
  "w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60";

export const authLabelClassName = "text-xs text-muted-foreground";
