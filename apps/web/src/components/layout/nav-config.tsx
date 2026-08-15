import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/roster", label: "War" },
  { href: "/history", label: "History" },
  { href: "/battle-rewards", label: "Rewards" },
  { href: "/leagues", label: "Leagues" },
  { href: "/community", label: "Community" },
  // Served by the bot through the BOT_UPSTREAM_URL proxy — 404s until that is set.
  { href: "/profile", label: "Profile" },
] as const;

export const MORE_LINKS = [
  { href: "/global", label: "Global" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const JOIN_LINK = { href: "/community?view=join", label: "Join" } as const;

export const DISCORD_URL = "https://discord.gg/k0iid" as const;

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="K0ii home"
      className={cn(
        "group/wordmark inline-flex items-baseline font-display font-bold leading-none tracking-tight text-ink",
        "text-[1.7rem] sm:text-[1.95rem]",
        // One motion for the whole wordmark. It used to lift each letter by a
        // different amount on its own delay, which read as three things moving
        // rather than one logo.
        "transition-[color,transform] duration-200 ease-[var(--ease-out)]",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:text-koi",
        "active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none",
        "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
        className,
      )}
    >
      {/* Versioned filename on purpose: Next serves optimised images with an
          immutable cache header, so replacing the file in place leaves browsers
          showing the old framing.
          Pre-cropped square crest (the "k0i2" wordmark is already removed), so
          this renders at its natural framing instead of being scaled up to hide
          the text — which is what made it look zoomed in. */}
      <Image
        src="/k0i2-crest-v2.png"
        alt=""
        width={128}
        height={128}
        priority
        className={cn(
          "mr-2 size-8 shrink-0 self-center rounded-lg object-cover sm:size-9",
          "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_35%,transparent)]",
          "shadow-[0_0_14px_-2px_color-mix(in_srgb,var(--koi-orange)_45%,transparent)]",
        )}
      />
      <span className="inline-block">K</span>
      <span className="inline-block">0</span>
      <span className="inline-block">ii</span>
    </Link>
  );
}
