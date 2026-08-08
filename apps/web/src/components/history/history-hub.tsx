"use client";

/**
 * THESIS: History hub - reports + replay share one battle pick, pond operate energy.
 * OWN-WORLD: Fredoka title, koi accent, HubViewSwitcher tabs.
 * STORY: Pick war → standings or scrub timeline.
 * FIRST VIEWPORT: Title, lede, view switch.
 * FORM: Operate refinement of legacy reports/replay clients.
 */

import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";

import { HubPanel, HubViewSwitcher } from "@/components/hub/view-switcher";
import { Heading } from "@/components/layout/heading";
import { ReplayPanel } from "@/components/history/replay-panel";
import { ReportsPanel } from "@/components/history/reports-panel";
import { useBattleArchive } from "@/lib/hooks/use-api";
import { formatNumber } from "@/lib/format";

const HISTORY_VIEWS = ["report", "replay"] as const;

const OPTIONS = [
  { value: "report" as const, label: "Reports" },
  { value: "replay" as const, label: "Replay" },
];

export function HistoryHub() {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(HISTORY_VIEWS).withDefault("report"),
  );
  const [battle, setBattle] = useQueryState("battle", parseAsString);
  const { data: archive } = useBattleArchive();
  const count = archive?.battles.length ?? 0;

  return (
    <div className="pond-page">
      <header className="animate-fade-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="pond-section-head">
          <Heading as="h1">
            Battle <span className="text-koi">history</span>
          </Heading>
          <p className="pond-lede">
            Final standings or scrub the war clock. Same battle pick drives both
            views.
          </p>
          {count > 0 ? (
            <p className="text-sm font-medium text-ink-soft">
              {formatNumber(count)} wars in the archive
            </p>
          ) : null}
        </div>
        <HubViewSwitcher
          ariaLabel="History view"
          value={view}
          options={OPTIONS}
          onChange={(next) => void setView(next)}
        />
      </header>

      <HubPanel key={view}>
        {view === "report" ? (
          <ReportsPanel
            battleId={battle}
            onBattleIdChange={(id) => void setBattle(id)}
          />
        ) : (
          <ReplayPanel
            battleId={battle}
            onBattleIdChange={(id) => void setBattle(id)}
          />
        )}
      </HubPanel>
    </div>
  );
}
