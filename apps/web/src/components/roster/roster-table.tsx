"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { RosterMember } from "@k0ii/schemas";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";

import {
  formatDuration,
  formatPoints,
  formatPph,
  formatSignedDelta,
} from "@/lib/format";
import { httpsOnlyUrl } from "@/lib/https-url";
import { relativeToneClass, TONE_CLASS_MAP } from "@/lib/tones";
import { cn } from "@/lib/utils";

export type RosterSortKey =
  | "rank"
  | "displayName"
  | "battlePoints"
  | "inactiveMs"
  | "inactiveTotalMs"
  | "streakPeakMs"
  | "pph"
  | "delta5m"
  | "delta30m"
  | "delta60m"
  | "delta12h"
  | "delta24h"
  | "avgPlacement"
  | "contributionPct";

export type RosterSortOrder = "asc" | "desc";

const SORT_KEYS: RosterSortKey[] = [
  "rank",
  "displayName",
  "battlePoints",
  "inactiveMs",
  "inactiveTotalMs",
  "streakPeakMs",
  "pph",
  "delta5m",
  "delta30m",
  "delta60m",
  "delta12h",
  "delta24h",
  "avgPlacement",
  "contributionPct",
];

export const MOBILE_SORT_OPTIONS: { key: RosterSortKey; label: string }[] = [
  { key: "battlePoints", label: "Points" },
  { key: "pph", label: "PPH" },
  { key: "delta5m", label: "5m" },
  { key: "inactiveMs", label: "Inactive" },
  { key: "streakPeakMs", label: "Best Streak" },
  { key: "avgPlacement", label: "Avg Place" },
  { key: "displayName", label: "Name" },
  { key: "rank", label: "Rank" },
];

export function normalizeRosterSortKey(value: string | null): RosterSortKey {
  if (value && SORT_KEYS.includes(value as RosterSortKey)) {
    return value as RosterSortKey;
  }
  return "battlePoints";
}

export function sortMembers(
  members: RosterMember[],
  key: RosterSortKey,
  order: RosterSortOrder,
): RosterMember[] {
  const sorted = [...members].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (key) {
      case "displayName":
        av = a.displayName.toLowerCase();
        bv = b.displayName.toLowerCase();
        break;
      case "rank":
        av = a.rank ?? Number.POSITIVE_INFINITY;
        bv = b.rank ?? Number.POSITIVE_INFINITY;
        break;
      case "avgPlacement":
        av = a.avgPlacement ?? Number.POSITIVE_INFINITY;
        bv = b.avgPlacement ?? Number.POSITIVE_INFINITY;
        break;
      default: {
        const rawA = a[key as keyof RosterMember];
        const rawB = b[key as keyof RosterMember];
        av = typeof rawA === "number" ? rawA : 0;
        bv = typeof rawB === "number" ? rawB : 0;
      }
    }
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

function SortHead({
  label,
  active,
  order,
  onClick,
  align = "right",
}: {
  label: string;
  active: boolean;
  order: RosterSortOrder;
  onClick: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        active && "text-koi",
      )}
    >
      {label}
      {active ? (
        order === "asc" ? (
          <ArrowUp className="size-3.5" aria-hidden />
        ) : (
          <ArrowDown className="size-3.5" aria-hidden />
        )
      ) : null}
    </button>
  );
}

function numCell(value: string, tone?: string, emphasize = false) {
  return (
    <span
      className={cn(
        "font-tabular text-sm",
        emphasize && "font-semibold text-ink",
        tone,
      )}
    >
      {value}
    </span>
  );
}

function MobileStat({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-tabular text-sm",
          emphasize && "font-semibold text-ink",
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PlayerCell({
  member,
}: {
  member: RosterMember;
}) {
  const avatarUrl = httpsOnlyUrl(member.avatarUrl);
  const initial = member.displayName.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div className="flex min-w-0 max-w-[220px] items-center gap-2.5">
      <span className="relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1f2937] ring-1 ring-[color-mix(in_srgb,var(--pond-teal)_28%,transparent)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span className="font-display text-xs font-bold text-koi" aria-hidden>
            {initial}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-semibold leading-tight text-ink">
          {member.displayName}
        </div>
        {member.role ? (
          <div className="truncate text-[11px] leading-snug text-ink-soft">
            {member.role}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function rankTone(index: number): string | undefined {
  if (index === 0)
    return "bg-[color-mix(in_srgb,var(--koi-orange)_10%,transparent)]";
  if (index === 1)
    return "bg-[color-mix(in_srgb,var(--pond-teal)_8%,transparent)]";
  if (index === 2)
    return "bg-[color-mix(in_srgb,var(--lily-green)_8%,transparent)]";
  return undefined;
}

export function RosterTable({
  members,
  battleLive = true,
  sortKey,
  sortOrder,
  onSort,
  onSortSelect,
  onSelectMember,
}: {
  members: RosterMember[];
  battleLive?: boolean;
  sortKey: RosterSortKey;
  sortOrder: RosterSortOrder;
  onSort: (key: RosterSortKey) => void;
  onSortSelect?: (key: RosterSortKey) => void;
  onSelectMember?: (member: RosterMember) => void;
}) {
  const maxes = useMemo(
    () => ({
      delta5m: Math.max(
        ...members.map((m) => Math.abs(Number(m.delta5m) || 0)),
        1,
      ),
      delta30m: Math.max(
        ...members.map((m) => Math.abs(Number(m.delta30m) || 0)),
        1,
      ),
      delta60m: Math.max(
        ...members.map((m) => Math.abs(Number(m.delta60m) || 0)),
        1,
      ),
      delta12h: Math.max(
        ...members.map((m) => Math.abs(Number(m.delta12h) || 0)),
        1,
      ),
      inactiveMs: Math.max(...members.map((m) => Number(m.inactiveMs) || 0), 1),
      pph: Math.max(...members.map((m) => Number(m.pph) || 0), 1),
    }),
    [members],
  );

  const sortSelect = onSortSelect ?? onSort;

  const columns = useMemo<ColumnDef<RosterMember>[]>(() => {
    const head = (
      key: RosterSortKey,
      label: string,
      align: "left" | "right" | "center" = "right",
    ) => (
      <SortHead
        label={label}
        active={sortKey === key}
        order={sortOrder}
        onClick={() => onSort(key)}
        align={align}
      />
    );

    return [
      {
        id: "rank",
        header: () => head("rank", "Rank", "center"),
        cell: ({ row }) =>
          numCell(
            battleLive && row.original.rank != null
              ? String(row.original.rank)
              : battleLive
                ? String(row.index + 1)
                : "-",
            undefined,
            true,
          ),
        meta: { align: "center" },
      },
      {
        id: "player",
        header: () => head("displayName", "Player", "left"),
        cell: ({ row }) => <PlayerCell member={row.original} />,
        meta: { align: "left" },
      },
      {
        id: "battlePoints",
        header: () => head("battlePoints", "Points"),
        cell: ({ row }) =>
          numCell(formatPoints(row.original.battlePoints), undefined, true),
      },
      {
        id: "inactiveMs",
        header: () => head("inactiveMs", "Inactive"),
        cell: ({ row }) =>
          numCell(
            formatDuration(row.original.inactiveMs),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.inactiveMs, maxes.inactiveMs, true)
            ],
          ),
      },
      {
        id: "pph",
        header: () => head("pph", "PPH"),
        cell: ({ row }) =>
          numCell(
            formatPph(row.original.pph),
            TONE_CLASS_MAP[relativeToneClass(row.original.pph, maxes.pph)],
            true,
          ),
      },
      {
        id: "delta5m",
        header: () => head("delta5m", "5m"),
        cell: ({ row }) =>
          numCell(
            formatSignedDelta(row.original.delta5m),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.delta5m, maxes.delta5m)
            ],
          ),
      },
      {
        id: "delta30m",
        header: () => head("delta30m", "30m"),
        cell: ({ row }) =>
          numCell(
            formatSignedDelta(row.original.delta30m),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.delta30m, maxes.delta30m)
            ],
          ),
        meta: { showFrom: "lg" },
      },
      {
        id: "delta60m",
        header: () => head("delta60m", "60m"),
        cell: ({ row }) =>
          numCell(
            formatSignedDelta(row.original.delta60m),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.delta60m, maxes.delta60m)
            ],
          ),
        meta: { showFrom: "lg" },
      },
      {
        id: "delta12h",
        header: () => head("delta12h", "12h"),
        cell: ({ row }) =>
          numCell(
            formatSignedDelta(row.original.delta12h),
            TONE_CLASS_MAP[
              relativeToneClass(row.original.delta12h, maxes.delta12h)
            ],
          ),
        meta: { showFrom: "xl" },
      },
    ];
  }, [battleLive, maxes, sortKey, sortOrder, onSort]);

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const maxPts = useMemo(
    () => Math.max(...members.map((m) => Number(m.battlePoints) || 0), 1),
    [members],
  );

  return (
    <div className="pond-card overflow-hidden">
      <div className="md:hidden">
        <div className="flex gap-2 border-b border-[color-mix(in_srgb,var(--pond-teal)_18%,transparent)] bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] p-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Sort members by</span>
            <select
              className="h-11 w-full rounded-[var(--radius-input)] border border-border bg-card-surface px-3 font-display text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-pond-teal/40"
              value={sortKey}
              onChange={(e) =>
                sortSelect(normalizeRosterSortKey(e.target.value))
              }
            >
              {MOBILE_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-border bg-card-surface px-3 font-display text-sm font-semibold text-ink transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pond-teal/40"
            onClick={() => onSort(sortKey)}
            aria-label={
              sortOrder === "asc" ? "Sort descending" : "Sort ascending"
            }
          >
            {sortOrder === "asc" ? (
              <ArrowUp className="size-4 text-koi" aria-hidden />
            ) : (
              <ArrowDown className="size-4 text-koi" aria-hidden />
            )}
            <span className="text-ink-soft">
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </span>
          </button>
        </div>

        <ul className="max-h-[min(70vh,52rem)] divide-y divide-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] overflow-y-auto overscroll-contain">
          {members.map((member, i) => (
            <li key={`${member.robloxUserId}-${i}`}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col gap-2.5 px-3 py-3 text-left outline-none",
                  "transition-[transform,background-color] duration-150 ease-[var(--ease-out)]",
                  "active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pond-teal/35",
                  rankTone(i) ??
                    (i % 2 === 1 ? "bg-card-surface-alt" : "bg-card-surface"),
                )}
                onClick={() => onSelectMember?.(member)}
                aria-label={`Open ${member.displayName}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-center font-tabular text-sm font-semibold text-koi">
                    {battleLive && member.rank != null
                      ? member.rank
                      : battleLive
                        ? i + 1
                        : "-"}
                  </span>
                  <PlayerCell member={member} />
                </div>
                <div className="space-y-2 pl-11">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pond-teal)_16%,transparent)]">
                    <span
                      className="block h-full rounded-full bg-pond-teal"
                      style={{
                        width: `${Math.min(100, ((Number(member.battlePoints) || 0) / maxPts) * 100).toFixed(2)}%`,
                      }}
                    />
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <MobileStat
                      label="Points"
                      value={formatPoints(member.battlePoints)}
                      emphasize
                    />
                    <MobileStat
                      label="PPH"
                      value={formatPph(member.pph)}
                      emphasize
                    />
                    <MobileStat
                      label="5m"
                      value={formatSignedDelta(member.delta5m)}
                      tone={
                        TONE_CLASS_MAP[
                          relativeToneClass(member.delta5m, maxes.delta5m)
                        ]
                      }
                    />
                    <MobileStat
                      label="Idle"
                      value={formatDuration(member.inactiveMs)}
                      tone={
                        TONE_CLASS_MAP[
                          relativeToneClass(
                            member.inactiveMs,
                            maxes.inactiveMs,
                            true,
                          )
                        ]
                      }
                    />
                  </div>
                </div>
              </button>
            </li>
          ))}
          {!members.length ? (
            <li className="px-6 py-14 text-center">
              <p className="font-display text-base font-semibold text-ink">
                No players match
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Clear the search or try another name.
              </p>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="hidden max-h-[min(70vh,52rem)] overflow-auto overscroll-contain md:block">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { align?: string; showFrom?: string }
                    | undefined;
                  const hide =
                    meta?.showFrom === "lg"
                      ? "hidden lg:table-cell"
                      : meta?.showFrom === "xl"
                        ? "hidden xl:table-cell"
                        : "";
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "sticky top-0 z-10 h-11 bg-[color-mix(in_srgb,var(--card-surface-alt)_94%,var(--pond-teal))] px-3",
                        "border-b border-[color-mix(in_srgb,var(--pond-teal)_22%,transparent)]",
                        hide,
                        meta?.align === "left" && "text-left",
                        meta?.align === "center" && "text-center",
                        (!meta?.align || meta.align === "right") &&
                          "text-right",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => {
              const member = row.original;
              return (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors duration-150 ease-[var(--ease-out)]",
                  rankTone(i) ??
                    (i % 2 === 0
                      ? "bg-card-surface/70"
                      : "bg-card-surface-alt/60"),
                  onSelectMember &&
                    "cursor-pointer hover:bg-[color-mix(in_srgb,var(--pond-teal)_10%,transparent)] active:scale-[0.998]",
                )}
                onClick={() => onSelectMember?.(member)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMember?.(member);
                  }
                }}
                tabIndex={onSelectMember ? 0 : undefined}
                role={onSelectMember ? "button" : undefined}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { align?: string; showFrom?: string }
                    | undefined;
                  const hide =
                    meta?.showFrom === "lg"
                      ? "hidden lg:table-cell"
                      : meta?.showFrom === "xl"
                        ? "hidden xl:table-cell"
                        : "";
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "border-b border-[color-mix(in_srgb,var(--pond-teal)_12%,transparent)] px-3 py-2.5",
                        hide,
                        meta?.align === "left" && "text-left",
                        meta?.align === "center" && "text-center",
                        (!meta?.align || meta.align === "right") &&
                          "text-right",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
