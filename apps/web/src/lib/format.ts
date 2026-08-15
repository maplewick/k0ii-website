const numberFmt = new Intl.NumberFormat("en-US");
const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return numberFmt.format(Math.round(value));
}

export function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 100_000) return numberFmt.format(Math.round(value));
  if (Math.abs(value) >= 1_000_000) return compactFmt.format(value);
  return numberFmt.format(Math.round(value));
}

export function formatSignedDelta(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = Math.round(value);
  const body = formatPoints(Math.abs(n));
  if (n > 0) return `+${body}`;
  if (n < 0) return `−${body}`;
  return body;
}

export function formatPph(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1_000_000) return `${compactFmt.format(value)}/h`;
  if (Math.abs(value) >= 100_000) return `${Math.round(value / 1_000)}k/h`;
  return `${Math.round(value).toLocaleString()}/h`;
}

/** Full PPH on neighbor cards — no compact K/M. */
export function formatNeighborPph(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value)}/hr`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.round(totalSec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export function formatActiveRoster(
  active: number | null | undefined,
  roster: number | null | undefined,
): string {
  if (active == null || !Number.isFinite(active)) return "—";
  const a = Math.round(active);
  if (roster == null || !Number.isFinite(roster) || roster <= 0) {
    return formatNumber(a);
  }
  return `${formatNumber(a)}/${formatNumber(roster)}`;
}

export function formatPassEta(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return "Will not pass before battle ends";
  }
  const totalSec = Math.floor(seconds);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${Math.max(1, m)}m`;
}

/** HH:MM:SS countdown for live battle window. */
export function formatBattleCountdown(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) {
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatRelativeTime(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "—";
  const diff = Date.now() - timestamp;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
