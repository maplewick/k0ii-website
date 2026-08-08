"use client";

import type { RosterResponse } from "@k0ii/schemas";

import { Heading } from "@/components/layout/heading";
import { Badge } from "@/components/ui/badge";
import { CoverageSection } from "@/components/war/coverage-section";
import { GraphsSection } from "@/components/war/graphs-section";
import { cn } from "@/lib/utils";

export function ChartsPanel({
  initialRoster,
}: {
  initialRoster?: RosterResponse | null;
}) {
  const live = Boolean(initialRoster?.battle?.live);

  return (
    <div className="pond-stack animate-fade-rise">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 pond-section-head">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-block size-3 shrink-0 rounded-full",
                live
                  ? "race-live-dot bg-lily"
                  : "bg-[color-mix(in_srgb,var(--ink-soft)_50%,transparent)]",
              )}
              aria-hidden
            />
            <Heading as="h2" className="truncate">
              Charts
            </Heading>
            <Badge variant={live ? "success" : "secondary"}>
              {live ? "Live battle" : "Last battle"}
            </Badge>
          </div>
          <p className="text-sm text-ink-soft">
            Clan trend lines and when points land through the day.
          </p>
        </div>
      </header>

      <GraphsSection embedded />
      <CoverageSection initialRoster={initialRoster} embedded />
    </div>
  );
}
