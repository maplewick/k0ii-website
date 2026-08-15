import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Gift,
  History,
  MessageCircle,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Accent = "koi" | "teal" | "lily";

type Tile = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon: LucideIcon;
  accent: Accent;
  art?: string;
  featured?: boolean;
};

const TILES: Tile[] = [
  {
    title: "Live Battle",
    description: "See who's on the board and how the clan is scoring.",
    href: "/roster",
    icon: Swords,
    accent: "koi",
    featured: true,
  },
  {
    title: "Discord",
    description: "Where the clan chats and war calls happen.",
    href: "https://discord.gg/k0iid",
    external: true,
    icon: MessageCircle,
    accent: "teal",
  },
  {
    title: "History",
    description: "Past battle standings and timeline replays.",
    href: "/history",
    icon: History,
    accent: "teal",
  },
  {
    title: "Rewards",
    description: "Placement rewards and K0ii top-3 payouts.",
    href: "/battle-rewards",
    icon: Gift,
    accent: "koi",
  },
  {
    title: "Leagues",
    description: "Track the leagues your clan is in, plus the top 100 overall.",
    href: "/leagues",
    icon: Trophy,
    accent: "lily",
  },
  {
    title: "Community",
    description: "How to join K0ii, plus the clan registry.",
    href: "/community",
    icon: Users,
    accent: "teal",
  },
];

function accentIcon(accent: Accent) {
  if (accent === "koi") {
    return "bg-[color-mix(in_srgb,var(--koi-orange)_18%,var(--card-surface))] text-koi ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_22%,transparent)]";
  }
  if (accent === "lily") {
    return "bg-[color-mix(in_srgb,var(--lily-green)_20%,var(--card-surface))] text-lily ring-1 ring-[color-mix(in_srgb,var(--lily-green)_22%,transparent)]";
  }
  return "bg-[color-mix(in_srgb,var(--pond-teal)_18%,var(--card-surface))] text-pond-teal ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]";
}

function tileSurface(tile: Tile) {
  if (tile.featured) {
    return cn(
      "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--koi-orange)_16%,var(--card-surface)),var(--card-surface)_42%,color-mix(in_srgb,var(--pond-teal)_12%,var(--card-surface)))]",
      "ring-1 ring-[color-mix(in_srgb,var(--koi-orange)_30%,transparent)]",
    );
  }
  if (tile.accent === "lily") {
    return "bg-[linear-gradient(155deg,color-mix(in_srgb,var(--lily-green)_14%,var(--card-surface)),var(--card-surface)_70%)]";
  }
  if (tile.accent === "koi") {
    return "bg-[linear-gradient(155deg,color-mix(in_srgb,var(--koi-orange)_13%,var(--card-surface)),var(--card-surface)_70%)]";
  }
  return "bg-[linear-gradient(155deg,color-mix(in_srgb,var(--pond-teal)_13%,var(--card-surface)),var(--card-surface)_70%)]";
}

function Blob({ accent }: { accent: Accent }) {
  const color =
    accent === "koi"
      ? "var(--koi-orange)"
      : accent === "lily"
        ? "var(--lily-green)"
        : "var(--pond-teal)";

  return (
    <div
      className={cn(
        "pointer-events-none absolute -right-8 -top-6 size-28 rounded-full blur-2xl",
        "opacity-50 transition-opacity duration-200 ease-[var(--ease-out)]",
        "group-hover:opacity-80",
      )}
      style={{
        background: `radial-gradient(circle, color-mix(in srgb, ${color} 32%, transparent), transparent 70%)`,
      }}
      aria-hidden
    />
  );
}

function BentoTile({ tile, index }: { tile: Tile; index: number }) {
  const Icon = tile.icon;
  const ExternalIcon = tile.external ? ArrowUpRight : ArrowRight;

  const inner = (
    <>
      <Blob accent={tile.accent} />

      {tile.art ? (
        <Image
          src={tile.art}
          alt=""
          width={140}
          height={140}
          className={cn(
            "pointer-events-none absolute -right-2 -bottom-3 z-0 object-contain",
            "size-24 opacity-[0.38] drop-shadow-md sm:size-28",
            "transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-55",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105",
          )}
          aria-hidden
        />
      ) : null}

      <div className="relative z-[1] flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-[var(--radius-input)]",
            "transition-transform duration-200 ease-[var(--ease-out)]",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105",
            accentIcon(tile.accent),
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <ExternalIcon
          className={cn(
            "mt-1 size-4 shrink-0 text-ink-soft/70",
            "transition-[opacity,transform,color] duration-200 ease-[var(--ease-out)]",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-koi",
          )}
          aria-hidden
        />
      </div>

      <div className="relative z-[1] mt-auto space-y-1.5 pt-6">
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
          {tile.title}
        </h3>
        <p className="max-w-[28ch] text-sm leading-relaxed text-ink-soft">
          {tile.description}
        </p>
      </div>
    </>
  );

  const shell = cn(
    "pond-card group relative flex h-full min-h-[10.5rem] flex-col overflow-hidden",
    "p-5 sm:p-6",
    "transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
    "hover:shadow-[var(--shadow-card-hover)]",
    "active:scale-[0.99] motion-reduce:active:scale-100",
    "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
    "animate-fade-rise",
    tileSurface(tile),
  );

  const style = { animationDelay: `${70 + index * 40}ms` } as const;

  if (tile.external) {
    return (
      <a
        href={tile.href}
        target="_blank"
        rel="noopener noreferrer"
        className={shell}
        style={style}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={tile.href} className={shell} style={style}>
      {inner}
    </Link>
  );
}

export function DestinationBento() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {TILES.map((tile, index) => (
        <BentoTile key={tile.title} tile={tile} index={index} />
      ))}
    </div>
  );
}
