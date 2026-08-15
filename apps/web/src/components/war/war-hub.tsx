"use client";

import type { RosterResponse } from "@k0ii/schemas";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { HubPanel, HubViewSwitcher } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { RosterView } from "@/components/roster/roster-view";
import { ChartsPanel } from "@/components/war/charts-panel";
import { ClansPanel } from "@/components/war/clans-panel";
import { RacePanel } from "@/components/war/race-panel";

const WAR_VIEWS = ["members", "race", "clans", "charts"] as const;

const OPTIONS = [
  { value: "members" as const, label: "Members" },
  { value: "race" as const, label: "Race" },
  { value: "clans" as const, label: "Clans" },
  { value: "charts" as const, label: "Charts" },
];

export function WarHub({
  data,
  error,
}: {
  data: RosterResponse | null;
  error: string | null;
}) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(WAR_VIEWS).withDefault("members"),
  );

  const live = Boolean(data?.battle?.live);

  return (
    <div className="pond-page">
      <header className="animate-fade-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="pond-section-head">
          <Heading as="h1">
            Battle <span className="text-koi">View</span>
          </Heading>
          <p className="pond-lede">
            {live
              ? "Spot grinders, catch slaking, watch the clan climb."
              : "Last look at members, pace, and nearby clans for this battle."}
          </p>
        </div>
        <HubViewSwitcher
          ariaLabel="War view"
          value={view}
          options={OPTIONS}
          onChange={(next) => void setView(next)}
        />
      </header>

      <HubPanel key={view}>
        {view === "members" ? <RosterView data={data} error={error} embedded /> : null}
        {view === "race" ? <RacePanel initialRoster={data} /> : null}
        {view === "clans" ? <ClansPanel /> : null}
        {view === "charts" ? <ChartsPanel initialRoster={data} /> : null}
      </HubPanel>
    </div>
  );
}
