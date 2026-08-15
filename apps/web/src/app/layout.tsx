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

/**
 * Absolute base for og:image. Railway injects RAILWAY_PUBLIC_DOMAIN per service,
 * so staging advertises its own card rather than pointing at production; set
 * NEXT_PUBLIC_SITE_URL to override once the domain moves.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : undefined);

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: "K0ii Clan Tracker",
  description: "Live PS99 clan war roster for K0i2",
  // Without this, X/Twitter falls back to a small thumbnail beside the text
  // instead of showing the share card. Discord uses the og tags Next emits
  // from opengraph-image.tsx automatically.
  twitter: {
    card: "summary_large_image",
    title: "K0ii Clan Tracker",
    description: "Live PS99 clan war roster for K0i2",
  },
  openGraph: {
    title: "K0ii Clan Tracker",
    description: "Live PS99 clan war roster for K0i2",
    siteName: "K0ii",
    type: "website",
  },
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
