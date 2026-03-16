import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="antialiased bg-[#121212] text-gray-200 h-screen w-screen overflow-hidden selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  );
}
