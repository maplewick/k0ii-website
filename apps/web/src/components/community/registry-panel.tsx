"use client";

import { useMemo, useState } from "react";

import { HubEmpty, HubSkeleton } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import {
  DialogSection,
  EmptyPanel,
  MetricTile,
  dialogContentClass,
} from "@/components/roster/dialog-bits";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, formatPoints } from "@/lib/format";
import { useRegistry, useRoster } from "@/lib/hooks/use-api";
import {
  REGISTRY_EXCLUDED_IDS,
  REGISTRY_SECTIONS,
  SECTION_BLURBS,
  type RegistryPerson,
} from "@/lib/registry-data";
import { cn } from "@/lib/utils";
import type { RegistryBattleEntry } from "@k0ii/schemas";

type EnrichedPerson = RegistryPerson & {
  avatarUrl?: string | null;
  battles: RegistryBattleEntry[];
  isMemberOnly?: boolean;
};

function httpsAvatar(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://") || trimmed.length > 2048) return null;
  if (/[\s"'<>]/.test(trimmed)) return null;
  return trimmed;
}

/** Only allow #hex into CSS so roleColor cannot break out of style strings. */
function hexColor(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-f]{3,6}$/i.test(value)
    ? value
    : undefined;
}

function warLabel(count: number) {
  if (count <= 0) return "No wars";
  return `${formatNumber(count)} war${count === 1 ? "" : "s"}`;
}

function Avatar({
  person,
  size = "md",
}: {
  person: EnrichedPerson;
  size?: "md" | "lg";
}) {
  const avatar = httpsAvatar(person.avatarUrl);
  const accent = hexColor(person.roleColor) ?? "var(--pond-teal)";
  const dim = size === "lg" ? "size-[5.5rem]" : "size-16";
  const ringStyle = {
    boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 45%, transparent), 0 0 0 6px color-mix(in srgb, ${accent} 12%, transparent)`,
  };

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        referrerPolicy="no-referrer"
        width={size === "lg" ? 88 : 64}
        height={size === "lg" ? 88 : 64}
        className={cn(dim, "shrink-0 rounded-full object-cover")}
        style={ringStyle}
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        "flex shrink-0 items-center justify-center rounded-full bg-card-surface-alt font-display font-bold",
        size === "lg" ? "text-3xl" : "text-xl",
      )}
      style={{ ...ringStyle, color: accent }}
    >
      {person.displayName.slice(0, 1)}
    </div>
  );
}

function PersonCard({
  person,
  featured = false,
  onOpen,
  delayMs = 0,
}: {
  person: EnrichedPerson;
  featured?: boolean;
  onOpen: () => void;
  delayMs?: number;
}) {
  const warCount = person.battles.length;
  const latest = person.battles[0];
  const accent = hexColor(person.roleColor) ?? "var(--pond-teal)";
  const line =
    person.personalBio?.trim() ||
    (featured ? person.bio?.trim() : null) ||
    null;
  const showHandle =
    person.username.trim().toLowerCase() !==
    person.displayName.trim().toLowerCase();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${person.displayName}'s profile`}
      className={cn(
        "pond-card group relative flex h-full w-full flex-col overflow-hidden text-left",
        "animate-fade-rise",
        "transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)]",
        "active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:animate-none",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[var(--shadow-card-hover)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pond-bg,#5FCBDB)]",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 28%, transparent), transparent 70%)`,
        }}
        aria-hidden
      />

      <div
        className={cn(
          "relative flex h-full min-h-[16.5rem] flex-1 flex-col",
          featured
            ? "gap-4 pond-pad sm:min-h-[13.5rem] sm:flex-row sm:items-start sm:gap-6"
            : "items-center gap-3 p-5 text-center sm:p-6",
        )}
      >
        <Avatar person={person} size={featured ? "lg" : "md"} />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-1.5",
            !featured && "w-full items-center",
          )}
        >
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: accent }}
          >
            {person.role}
          </p>
          <p className="line-clamp-1 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
            {person.displayName}
          </p>
          {showHandle ? (
            <p className="line-clamp-1 text-sm text-ink-soft">
              @{person.username}
            </p>
          ) : null}

          <div
            className={cn(
              "w-full",
              featured ? "min-h-[3rem]" : "min-h-[2.25rem]",
            )}
          >
            {line ? (
              <p
                className={cn(
                  "whitespace-pre-line leading-relaxed text-ink-soft",
                  featured
                    ? "line-clamp-3 text-sm"
                    : "line-clamp-2 text-xs sm:text-sm",
                )}
              >
                {line}
              </p>
            ) : (
              <span className="block h-4" aria-hidden />
            )}
          </div>

          <div
            className={cn(
              "mt-auto flex flex-wrap items-center gap-2 pt-2",
              !featured && "justify-center",
            )}
          >
            <Badge variant={warCount > 0 ? "info" : "secondary"}>
              {warLabel(warCount)}
            </Badge>
            {latest ? (
              <span className="text-xs tabular-nums text-ink-soft">
                Best {formatPoints(latest.points)}
              </span>
            ) : null}
          </div>
          <p className="pt-1 text-xs font-semibold text-pond-teal transition-colors duration-200 ease-[var(--ease-out)] group-hover:text-koi">
            Open profile
          </p>
        </div>
      </div>
    </button>
  );
}

function ProfileDialog({
  person,
  open,
  onOpenChange,
}: {
  person: EnrichedPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!person) return null;

  const wars = person.battles;
  const totalPts = wars.reduce((sum, b) => sum + b.points, 0);
  const best = wars[0];
  const live = wars.find((b) => b.active);
  const accent = hexColor(person.roleColor) ?? "var(--pond-teal)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClass} showCloseButton>
        <DialogHeader
          className="gap-4 overflow-hidden rounded-[var(--radius-input)] sm:flex-row sm:items-start"
          style={{
            background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 16%, var(--card-surface)), var(--card-surface) 72%)`,
          }}
        >
          <div className="flex w-full flex-col gap-4 p-3 sm:flex-row sm:items-start sm:p-4">
            <Avatar person={person} size="lg" />
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-semibold" style={{ color: accent }}>
                {person.role}
              </p>
              <DialogTitle className="font-display text-2xl font-bold text-ink sm:text-3xl">
                {person.displayName}
              </DialogTitle>
              <DialogDescription className="text-ink-soft">
                @{person.username}
              </DialogDescription>
              {person.personalBio ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {person.personalBio}
                </p>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <MetricTile label="Wars" value={formatNumber(wars.length)} />
          <MetricTile
            label="Career points"
            value={formatPoints(totalPts)}
            accent
          />
          <MetricTile
            label="Best war"
            value={best ? formatPoints(best.points) : "-"}
            hint={
              best
                ? `#${best.rank} of ${best.total}${
                    best.clanPlace != null
                      ? ` - clan #${best.clanPlace}`
                      : ""
                  }`
                : undefined
            }
          />
        </div>

        {live ? (
          <div className="rounded-[var(--radius-input)] bg-[color-mix(in_srgb,var(--lily)_18%,var(--card-surface-alt))] px-4 py-3 ring-1 ring-[color-mix(in_srgb,var(--lily)_35%,transparent)]">
            <p className="text-xs font-semibold text-lily">Live war</p>
            <p className="mt-0.5 font-display text-sm font-semibold text-ink">
              {live.battleId} - {formatPoints(live.points)} pts - #{live.rank}{" "}
              of {live.total}
            </p>
          </div>
        ) : null}

        {person.bio && person.bio !== person.personalBio ? (
          <DialogSection title="About">
            <p className="text-sm leading-relaxed text-ink-soft">{person.bio}</p>
          </DialogSection>
        ) : null}

        <DialogSection
          title="Clan war record"
          description={
            wars.length > 0
              ? "Sorted by points contributed"
              : "No contributions recorded yet"
          }
        >
          {wars.length === 0 ? (
            <EmptyPanel>No clan war contributions recorded.</EmptyPanel>
          ) : (
            <div className="max-h-[min(40vh,18rem)] divide-y divide-[color-mix(in_srgb,var(--pond-teal)_14%,transparent)] overflow-y-auto overscroll-contain rounded-[var(--radius-input)] bg-card-surface-alt/60 ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
              {wars.map((b) => (
                <div
                  key={b.battleId}
                  className={cn(
                    "flex flex-wrap items-baseline justify-between gap-2 px-3.5 py-2.5",
                    b.active &&
                      "bg-[color-mix(in_srgb,var(--lily)_12%,transparent)]",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-ink">
                      {b.battleId}
                      {b.active ? (
                        <Badge variant="success" className="ml-2 align-middle">
                          Live
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-ink-soft">
                      #{b.rank} of {b.total} in clan
                      {b.clanPlace != null
                        ? ` - clan placed #${b.clanPlace}`
                        : ""}
                    </p>
                  </div>
                  <p className="font-tabular text-sm font-semibold text-koi">
                    {formatPoints(b.points)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogSection>
      </DialogContent>
    </Dialog>
  );
}

export function RegistryPanel() {
  const { data: roster, isLoading: rosterLoading } = useRoster({
    refetchInterval: false,
  });
  const {
    data: registry,
    isLoading: registryLoading,
    isError,
    refetch,
  } = useRegistry({ refetchInterval: false });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const staffSections = useMemo(() => {
    return REGISTRY_SECTIONS.map((section) => ({
      title: section.title,
      people: section.people.map((person): EnrichedPerson => {
        const id = String(person.robloxId);
        const live = roster?.members.find((m) => m.robloxUserId === id);
        return {
          ...person,
          avatarUrl:
            httpsAvatar(registry?.avatars?.[id]) ??
            httpsAvatar(live?.avatarUrl) ??
            null,
          battles: registry?.battleHistory?.[id] ?? [],
        };
      }),
    }));
  }, [registry, roster]);

  const staffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const section of REGISTRY_SECTIONS) {
      for (const person of section.people) ids.add(String(person.robloxId));
    }
    return ids;
  }, []);

  const memberPeople = useMemo((): EnrichedPerson[] => {
    return (roster?.members ?? [])
      .filter((m) => {
        if (!m.robloxUserId) return false;
        if (staffIds.has(m.robloxUserId)) return false;
        if (REGISTRY_EXCLUDED_IDS.has(m.robloxUserId)) return false;
        return true;
      })
      .map((m) => ({
        robloxId: Number(m.robloxUserId),
        username: m.displayName,
        displayName: m.displayName,
        role: m.role ?? "Member",
        roleColor: "#2E96A8",
        avatarUrl:
          httpsAvatar(registry?.avatars?.[m.robloxUserId]) ??
          httpsAvatar(m.avatarUrl),
        battles: registry?.battleHistory?.[m.robloxUserId] ?? [],
        isMemberOnly: true,
      }))
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
      );
  }, [roster, registry, staffIds]);

  const sections = useMemo(
    () => [...staffSections, { title: "Members", people: memberPeople }],
    [staffSections, memberPeople],
  );

  const selected =
    sections.flatMap((s) => s.people).find((p) => p.robloxId === selectedId) ??
    null;

  const loading = (registryLoading && !registry) || (rosterLoading && !roster);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <HubSkeleton className="h-52" />
          <HubSkeleton className="h-52" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HubSkeleton className="h-56" />
          <HubSkeleton className="h-56" />
          <HubSkeleton className="h-56" />
          <HubSkeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (isError && !registry) {
    return (
      <div className="space-y-4">
        <HubEmpty
          title="Registry unavailable"
          detail="Could not load avatars and war history. Try again."
        />
        <button
          type="button"
          onClick={() => void refetch()}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pond-chapters">
      {sections.map((section, si) => {
        const featured = section.title === "Leadership";
        const isMembers = section.title === "Members";

        return (
          <section
            key={section.title}
            id={`registry-${section.title.toLowerCase()}`}
            className="pond-section scroll-mt-24"
          >
            <div className="pond-section-head">
              <Heading as="h2">{section.title}</Heading>
              <p className="max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
                {SECTION_BLURBS[section.title] ?? "Staff in this role."}
              </p>
            </div>

            {isMembers && memberPeople.length === 0 ? (
              <EmptyPanel>
                No additional members found on the roster.
              </EmptyPanel>
            ) : (
              <div
                className={cn(
                  featured
                    ? "grid gap-4 md:grid-cols-2"
                    : "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4",
                )}
              >
                {section.people.map((person, pi) => (
                  <PersonCard
                    key={person.robloxId}
                    person={person}
                    featured={featured}
                    delayMs={Math.min(si * 40 + pi * 28, 280)}
                    onOpen={() => setSelectedId(person.robloxId)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <ProfileDialog
        person={selected}
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}
