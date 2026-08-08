import Link from "next/link";

import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/roster", label: "War" },
  { href: "/history", label: "History" },
  { href: "/battle-rewards", label: "Rewards" },
  { href: "/leagues", label: "Leagues" },
  { href: "/community", label: "Community" },
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
        "transition-transform duration-200 ease-[var(--ease-out)]",
        "active:scale-[0.97] motion-reduce:active:scale-100",
        "focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-card-surface",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block text-ink",
          "transition-[color,transform] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:text-koi",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:-translate-y-px",
        )}
      >
        K
      </span>
      <span
        className={cn(
          "inline-block text-koi",
          "transition-[color,transform] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:text-ink",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:-translate-y-1",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:scale-110",
        )}
      >
        0
      </span>
      <span
        className={cn(
          "inline-block text-ink",
          "transition-[color,transform] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:text-koi",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:-translate-y-px",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover/wordmark:delay-75",
        )}
      >
        ii
      </span>
    </Link>
  );
}
