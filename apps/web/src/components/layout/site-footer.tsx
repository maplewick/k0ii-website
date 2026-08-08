import Link from "next/link";

import { DISCORD_URL, JOIN_LINK } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/roster", label: "War" },
  { href: JOIN_LINK.href, label: "Join" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-2 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:mt-4 sm:px-4 sm:pb-6">
      <div
        className={cn(
          "mx-auto max-w-7xl overflow-hidden rounded-[var(--radius-card)]",
          "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--card-surface)_92%,var(--pond-teal)),var(--card-surface))]",
          "shadow-[var(--shadow-card)]",
          "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_20%,transparent)]",
        )}
      >
        <div className="flex flex-col gap-6 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-8">
          <div className="space-y-2">
            <Link
              href="/"
              className={cn(
                "inline-flex font-display text-2xl font-bold leading-none tracking-tight",
                "transition-colors duration-200 ease-[var(--ease-out)]",
                "[@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90",
                "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
              )}
            >
              <span className="text-ink">K</span>
              <span className="text-koi">0</span>
              <span className="text-ink">ii</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft sm:text-base">
              Track K0i2 through every war.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:justify-end"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-display text-sm font-semibold text-ink-soft",
                  "transition-[color,transform] duration-200 ease-[var(--ease-out)]",
                  "[@media(hover:hover)_and_(pointer:fine)]:hover:text-koi",
                  "active:scale-[0.97] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
                )}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "font-display text-sm font-semibold text-pond-teal",
                "transition-[color,transform] duration-200 ease-[var(--ease-out)]",
                "[@media(hover:hover)_and_(pointer:fine)]:hover:text-koi",
                "active:scale-[0.97] motion-reduce:active:scale-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
              )}
            >
              Discord
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
