import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kalend",
  description: "A fast, functional calendar application"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans")}>
      <body className="antialiased bg-background text-foreground h-screen w-screen overflow-hidden selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}
