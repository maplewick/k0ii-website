"use client";

import type { RosterMember } from "@k0ii/schemas";
import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DialogSection,
  EmptyPanel,
  MetricTile,
  Pip,
  RankedRow,
  SegmentedControl,
  dialogContentClass,
} from "@/components/roster/dialog-bits";
import { MemberSeriesChart } from "@/components/roster/member-series-chart";
import {
  clanAveragePph,
  contributionPct,
  derivePphSeries,
  findRosterNeighbors,
  peakDelta,
  pointsGapTo,
} from "@/lib/member-analytics";
import {
  formatDuration,
  formatPoints,
  formatPph,
  formatSignedDelta,
} from "@/lib/format";
import { MemberAvatar } from "@/components/roster/member-avatar";
import { useCustomizations } from "@/lib/hooks/use-customizations";
import { cn } from "@/lib/utils";

type ChartMode = "points" | "pph";

export function MemberDialog({
  member,
  members,
  clanTotalPoints,
  open,
  onOpenChange,
}: {
  member: RosterMember | null;
  members: RosterMember[];
  clanTotalPoints: number | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [chartMode, setChartMode] = useState<ChartMode>("points");

  useEffect(() => {
    setChartMode("points");
  }, [member?.robloxUserId]);

  const pointsSeries = useMemo(
    () =>
      (member?.series ?? [])
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp),
    [member],
  );

  const pphSeries = useMemo(() => derivePphSeries(pointsSeries), [pointsSeries]);

  const chartData = chartMode === "pph" ? pphSeries : pointsSeries;

  const share = member ? contributionPct(member, clanTotalPoints) : null;
  const avgPph = useMemo(() => clanAveragePph(members), [members]);
  const neighbors = member ? findRosterNeighbors(members, member) : null;
  const gapAbove = member ? pointsGapTo(member, neighbors?.above ?? null) : null;
  const gapBelow = member ? pointsGapTo(member, neighbors?.below ?? null) : null;
  const peak5mWindow = useMemo(() => peakDelta(pointsSeries), [pointsSeries]);

  const pphVsClan =
    member?.pph != null && avgPph != null ? member.pph - avgPph : null;

  // Above the early return — hooks cannot run conditionally.
  const { data: customizations } = useCustomizations();

  if (!member) return null;

  const ppd =
    member.pph != null && Number.isFinite(member.pph) ? member.pph * 24 : null;
  const profileUrl = `https://www.roblox.com/users/${encodeURIComponent(member.robloxUserId)}/profile`;
  const custom = customizations?.[String(member.robloxUserId)] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogContentClass, "sm:max-w-5xl")}>
        <DialogHeader className="gap-3 pr-10">
          <div className="flex items-center gap-3">
            <MemberAvatar
              avatarUrl={member.avatarUrl}
              displayName={member.displayName}
              customization={custom}
              size="lg"
            />
            <div className="min-w-0">
              <DialogTitle
                style={custom?.nameColor ? { color: custom.nameColor } : undefined}
                className="truncate font-display text-2xl font-bold text-ink"
              >
                {member.displayName}
                {custom?.bestMedal?.emoji ? (
                  <span
                    title={custom.bestMedal.label}
                    className="ml-1.5 text-lg"
                    aria-label={custom.bestMedal.label}
                  >
                    {custom.bestMedal.emoji}
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-sm text-ink-soft">
                {custom?.customTitle ??
                  custom?.status ??
                  (member.role
                    ? `${member.role} · roster stats`
                    : "Roster stats for this battle")}
              </DialogDescription>
            </div>
            {custom?.careerBadge ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={custom.careerBadge.image}
                alt={custom.careerBadge.label}
                title={custom.careerBadge.label}
                className="ml-auto size-10 shrink-0 object-contain"
              />
            ) : null}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MetricTile
            label="Points"
            value={formatPoints(member.battlePoints)}
            accent
          />
          <MetricTile label="PPH" value={formatPph(member.pph)} accent />
          <MetricTile
            label="PPD"
            value={ppd != null ? formatPoints(ppd) : "-"}
            hint="At current pace"
          />
          <MetricTile
            label="Clan share"
            value={share != null ? `${share.toFixed(1)}%` : "-"}
            hint={
              member.rank != null ? `Roster rank #${member.rank}` : undefined
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <MetricTile label="5m" value={formatSignedDelta(member.delta5m)} />
          <MetricTile label="30m" value={formatSignedDelta(member.delta30m)} />
          <MetricTile label="60m" value={formatSignedDelta(member.delta60m)} />
          <MetricTile label="12h" value={formatSignedDelta(member.delta12h)} />
          <MetricTile
            label="Total inactive"
            value={formatDuration(member.inactiveTotalMs)}
          />
          <MetricTile
            label="Vs clan PPH"
            value={
              pphVsClan != null ? formatSignedDelta(Math.round(pphVsClan)) : "-"
            }
            hint={avgPph != null ? `Clan avg ${formatPph(avgPph)}` : undefined}
          />
        </div>

        {(neighbors?.above || neighbors?.below) && (
          <DialogSection
            title="Roster neighbors"
            description="Gap to the players directly above and below on points"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {neighbors?.above ? (
                <RankedRow
                  rank={neighbors.above.rank ?? undefined}
                  label={neighbors.above.displayName}
                  value={
                    gapAbove != null && gapAbove > 0
                      ? `${formatPoints(gapAbove)} behind`
                      : "-"
                  }
                />
              ) : null}
              {neighbors?.below ? (
                <RankedRow
                  rank={neighbors.below.rank ?? undefined}
                  label={neighbors.below.displayName}
                  value={
                    gapBelow != null && gapBelow < 0
                      ? `${formatPoints(Math.abs(gapBelow))} ahead`
                      : "-"
                  }
                  valueClassName="text-lily"
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {member.pph != null &&
              neighbors?.above?.pph != null &&
              gapAbove != null &&
              gapAbove > 0 ? (
                <Pip>
                  {member.pph > neighbors.above.pph ? (
                    <TrendingUp className="size-3 text-lily" aria-hidden />
                  ) : (
                    <TrendingDown className="size-3 text-alert" aria-hidden />
                  )}
                  Catching #{neighbors.above.rank}:{" "}
                  {member.pph > neighbors.above.pph
                    ? "yes at pace"
                    : "not at pace"}
                </Pip>
              ) : null}
              {member.pph != null && neighbors?.below?.pph != null ? (
                <Pip>
                  Holding #{neighbors.below.rank}:{" "}
                  {member.pph >= neighbors.below.pph
                    ? "safe pace"
                    : "under pressure"}
                </Pip>
              ) : null}
            </div>
            {peak5mWindow != null ? (
              <Pip title="Largest gain between consecutive snapshots">
                Best step {formatPoints(peak5mWindow)}
              </Pip>
            ) : null}
          </DialogSection>
        )}

        <DialogSection
          title={chartMode === "points" ? "Battle points" : "Points per hour"}
          description={`${chartData.length} snapshots in this battle window`}
          action={
            <SegmentedControl
              value={chartMode}
              onChange={setChartMode}
              options={[
                { id: "points", label: "Points" },
                { id: "pph", label: "PPH" },
              ]}
            />
          }
        >
          {chartData.length > 1 ? (
            <MemberSeriesChart data={chartData} mode={chartMode} />
          ) : (
            <EmptyPanel>Not enough snapshots for a chart yet.</EmptyPanel>
          )}
        </DialogSection>

        <DialogFooter className="sm:justify-end">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Roblox profile
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
