"use client";

import type { BattleArchiveEntry } from "@k0ii/schemas";

import { Heading } from "@/components/layout/heading";
import { humanBattleName } from "@/lib/analytics/replay";
import { formatNumber, formatPoints, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function battleLabel(b: BattleArchiveEntry): string {
  return b.title?.trim() || humanBattleName(b.battleId);
}

export function BattlePicker({
  battles,
  selectedId,
  onSelect,
  loading = false,
  emptyLabel = "No archived battles yet.",
  subtitle = "Newest first",
}: {
  battles: BattleArchiveEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  subtitle?: string;
}) {
  return (
    <>
      <label className="block space-y-1.5 lg:hidden">
        <span className="pond-label">Battle</span>
        <select
          className={cn(
            "w-full min-h-11 rounded-[var(--radius-input)] border-0 bg-card-surface px-3 py-2.5",
            "font-display text-sm font-semibold text-ink shadow-[var(--shadow-button)]",
            "ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-koi",
          )}
          value={selectedId ?? ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
          disabled={!battles.length}
        >
          {!battles.length ? (
            <option value="">{emptyLabel}</option>
          ) : (
            battles.map((b) => (
              <option key={b.battleId} value={b.battleId}>
                {b.ourRank != null ? `#${b.ourRank} · ` : ""}
                {battleLabel(b)}
              </option>
            ))
          )}
        </select>
      </label>

      <aside
        className={cn(
          "pond-card hidden overflow-hidden lg:block",
          "lg:sticky lg:top-24",
        )}
      >
        <div className="border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] px-4 py-3.5">
          <Heading as="h2" className="text-xl">
            Battles
          </Heading>
          <p className="mt-0.5 text-xs text-ink-soft">
            {loading
              ? "Loading archive…"
              : `${formatNumber(battles.length)} archived · ${subtitle}`}
          </p>
        </div>
        <div
          className="max-h-[min(70vh,36rem)] space-y-1 overflow-y-auto overscroll-contain p-2"
          role="listbox"
          aria-label="Battle archive"
        >
          {loading && !battles.length ? (
            <div className="space-y-1.5 p-1" aria-hidden>
              <div className="h-14 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
              <div className="h-14 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
              <div className="h-14 animate-pulse rounded-[var(--radius-input)] bg-card-surface-alt" />
            </div>
          ) : null}

          {battles.map((b) => {
            const active = selectedId === b.battleId;
            return (
              <button
                key={b.battleId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(b.battleId)}
                className={cn(
                  "flex w-full flex-col rounded-[var(--radius-input)] px-3 py-2.5 text-left",
                  "transition-[transform,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)]",
                  "active:scale-[0.97] motion-reduce:active:scale-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pond-teal/40",
                  active
                    ? "bg-koi text-white shadow-[var(--shadow-button)]"
                    : "hover:bg-card-surface-alt",
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-semibold">
                    {b.ourRank != null ? `#${formatNumber(b.ourRank)}` : "-"}
                    {" · "}
                    {formatPoints(b.ourPoints)}
                  </span>
                  {b.medal ? (
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold uppercase tracking-wide",
                        active ? "text-white/85" : "text-koi",
                      )}
                    >
                      {b.medal}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-0.5 truncate text-xs",
                    active ? "text-white/85" : "text-ink-soft",
                  )}
                >
                  <span className="font-medium">{battleLabel(b)}</span>
                  {" · "}
                  {formatRelativeTime(b.finalizedAt ?? b.endedAt)}
                </span>
              </button>
            );
          })}

          {!loading && !battles.length ? (
            <p className="px-3 py-8 text-center text-sm text-ink-soft">
              {emptyLabel}
            </p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
