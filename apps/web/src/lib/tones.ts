export type ToneClass =
  | "value-positive"
  | "value-warm"
  | "value-negative"
  | "value-neutral";

export function relativeToneClass(
  value: number | null | undefined,
  max: number | null | undefined,
  reverse = false,
): ToneClass {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "value-neutral";
  }
  const n = Number(value);
  const maxValue = Number(max);
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return n > 0 ? "value-positive" : n < 0 ? "value-negative" : "value-neutral";
  }
  if (reverse) {
    if (n <= maxValue * 0.33) return "value-positive";
    if (n <= maxValue * 0.67) return "value-warm";
    return "value-negative";
  }
  if (n <= maxValue * 0.33) return "value-negative";
  if (n <= maxValue * 0.67) return "value-warm";
  return "value-positive";
}

export const TONE_CLASS_MAP: Record<ToneClass, string> = {
  "value-positive": "text-lily",
  "value-warm": "text-koi",
  "value-negative": "text-alert",
  "value-neutral": "text-ink-soft",
};
