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
    <html lang="en">
      <body className="antialiased bg-[#1E1F20] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
