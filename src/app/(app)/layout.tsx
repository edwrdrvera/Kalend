import type { Metadata } from "next";
import "../globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/lib/theme";

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
    <html lang="en" data-theme="business" className={cn("font-sans")} suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning on <html> covers the class mismatch caused by
            the no-flash script applying 'dark' before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="antialiased bg-background text-foreground h-screen w-screen overflow-hidden selection:bg-primary/30">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
