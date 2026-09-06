import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/lib/theme";

// Plus Jakarta Sans is the app UI font — matches the design handoff.
// Loaded as a CSS variable so it can be applied on the body without
// needing a Tailwind theme override.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Kalend",
  description: "A fast, functional calendar application"
};

/** Injected before first paint to avoid a flash of the wrong theme.
 *  Reads localStorage; falls back to prefers-color-scheme. Runs synchronously
 *  so the <html> class is set before the browser renders a single pixel. */
const noFlashScript = `
(function(){
  try {
    var stored = localStorage.getItem('kalend-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (stored !== 'light' && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", plusJakartaSans.variable)} suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning on <html> covers the class mismatch caused by
            the no-flash script applying 'dark' before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className={cn(
        "antialiased bg-background text-foreground h-screen w-screen overflow-hidden selection:bg-primary/30",
        "font-[family-name:var(--font-plus-jakarta-sans)]"
      )}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
