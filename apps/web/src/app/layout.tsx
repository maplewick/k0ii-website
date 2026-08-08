import type { Metadata } from "next";
import { Bungee, Fredoka, Manrope } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
});

const brand = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "KOii Clan Tracker",
  description: "Live PS99 clan war roster for K0i2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${brand.variable} ${body.variable} min-h-dvh font-sans antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
