import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kalend",
  description:
    "Group deadlines, blockers, and reminders into Spaces, then focus your calendar on one part of your life at a time.",
};

// The marketing site is a deliberately light-themed lockup, separate from
// the app's own dark theme (see the (app) route group's layout). It's a
// second Next.js "root layout" — its own <html>/<body> — which is how a
// single App Router project renders two routes with different themes
// without one inheriting from the other. See the "multiple root layouts"
// pattern: https://nextjs.org/docs/app/building-your-application/routing/route-groups
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-kalend-landing",
});

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body
        className={cn(
          plusJakartaSans.variable,
          "antialiased font-[family-name:var(--font-kalend-landing)]",
          "bg-[var(--kal-bg)] text-[var(--kal-ink)] selection:bg-[var(--kal-accent)]/30"
        )}
      >
        {children}
      </body>
    </html>
  );
}
