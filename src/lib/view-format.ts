// Pure view-count helpers and the shared setting type. No server-only imports
// here, so client components can use these without pulling in @netlify/blobs.

export type ViewSetting =
  | { mode: "fixed"; value: number }
  | { mode: "auto"; start: string; startViews: number; target: number };

/**
 * A varied, believable auto-climb ceiling for a video, derived from its slug so
 * it's stable and *different per video* — so not every video maxes out at the
 * same round number. Ranges roughly 25,000–175,000, snapped to a tidy figure.
 */
export function suggestedClimbTarget(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (h >>> 0) / 4294967295; // 0..1
  return randomishTarget(r);
}

/** A fresh varied target (for the "random" button in the admin editor). */
export function randomClimbTarget(): number {
  return randomishTarget(Math.random());
}

function randomishTarget(r: number): number {
  const raw = 25000 + r * 150000; // ~25,000–175,000
  // Snap to a tidy step so it reads like a real number, not 87,412.
  const step = raw < 100000 ? 2500 : 5000;
  return Math.round(raw / step) * step;
}

/** "12,432" — the full number, for detail pages and the admin panel. */
export function formatViewsFull(n: number): string {
  return n.toLocaleString("en-US");
}

/** "12K" / "12.4K" / "1.2M" — compact, YouTube-style, for cards. */
export function formatViewsShort(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return (k >= 100 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)) + "K";
  }
  const m = n / 1_000_000;
  return (m >= 100 || Number.isInteger(m) ? Math.round(m) : m.toFixed(1)) + "M";
}
