import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Quanta",
    template: "%s | Quanta",
  },
  description:
    "AI-assisted estimating and tender workspace for subcontractors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={cn("h-full antialiased", inter.variable, jetbrainsMono.variable)}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
