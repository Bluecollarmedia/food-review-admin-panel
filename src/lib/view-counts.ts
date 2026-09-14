import { sharedStore } from "./blob-store";
import type { ViewSetting } from "./view-format";

// The public-facing view count for a video is one of three things:
//   1. Automatic (default): a stable slug-derived starting number
//      (5,000–15,000, sometimes up to ~30,000) plus its real views on top.
//   2. Fixed: an exact number the admin typed in.
//   3. Auto-climb: the number grows on its own over time on a YouTube-style
//      curve — fast at first, then a long slow crawl toward a target cap.
// The REAL view count is always available separately in the admin panel.

function settingsStore() {
  // Same store name as before, so any previously-saved plain-number overrides
  // keep working (they're read back as { mode: "fixed" }).
  return sharedStore("view-overrides");
}

const DAY_MS = 86_400_000;
// Roughly half the remaining gap to the target closes every 7 days: big jumps
// the first couple of weeks, then a long, slow crawl — like a real video.
const HALF_LIFE_DAYS = 7;

/**
 * A stable, slug-derived starting view count. The same slug always yields the
 * same number, so the padded count is consistent on every render.
 */
export function baseViews(slug: string): number {
  // FNV-1a hash of the slug -> stable 32-bit number.
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = (h >>> 0) / 4294967295; // 0..1
  let base = 5000 + Math.floor(r * 10000); // 5,000–15,000

  // Roughly one in four videos gets a bigger number, up to ~30,000, for variety.
  const r2 = (Math.imul(h ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967295;
  if (r2 < 0.25) {
    base += Math.floor((r2 / 0.25) * 15000); // adds up to ~15,000
  }
  return base;
}

function parseSetting(raw: unknown): ViewSetting | null {
  if (raw == null) return null;
  if (typeof raw === "number") return { mode: "fixed", value: raw }; // legacy override
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.mode === "fixed" && typeof o.value === "number") {
      return { mode: "fixed", value: o.value };
    }
    if (
      o.mode === "auto" &&
      typeof o.start === "string" &&
      typeof o.startViews === "number" &&
      typeof o.target === "number"
    ) {
      return { mode: "auto", start: o.start, startViews: o.startViews, target: o.target };
    }
  }
  return null;
}

export async function getViewSetting(slug: string): Promise<ViewSetting | null> {
  return parseSetting(await settingsStore().get(slug, { type: "json" }));
}

export async function getAllViewSettings(
  slugs: string[]
): Promise<Record<string, ViewSetting | null>> {
  const store = settingsStore();
  const entries = await Promise.all(
    slugs.map(
      async (s) => [s, parseSetting(await store.get(s, { type: "json" }))] as const
    )
  );
  return Object.fromEntries(entries);
}

export async function setFixedViews(slug: string, value: number): Promise<void> {
  const setting: ViewSetting = { mode: "fixed", value: Math.max(0, Math.round(value)) };
  await settingsStore().setJSON(slug, setting);
}

export async function setClimbingViews(
  slug: string,
  from: number,
  target: number
): Promise<void> {
  const setting: ViewSetting = {
    mode: "auto",
    start: new Date().toISOString(),
    startViews: Math.max(0, Math.round(from)),
    target: Math.max(0, Math.round(target)),
  };
  await settingsStore().setJSON(slug, setting);
}

export async function clearViewSetting(slug: string): Promise<void> {
  await settingsStore().delete(slug);
}

/** The current climbing value for an auto-climb setting. */
export function climbingViews(
  setting: Extract<ViewSetting, { mode: "auto" }>,
  now: number = Date.now()
): number {
  const { startViews, target } = setting;
  if (target <= startViews) return target;
  const start = new Date(setting.start).getTime();
  const days = Math.max(0, (now - start) / DAY_MS);
  const k = Math.LN2 / HALF_LIFE_DAYS;
  const fraction = 1 - Math.exp(-k * days); // 0 -> approaches 1
  return Math.round(startViews + (target - startViews) * fraction);
}

/** The number the public should see for a video. */
export function publicViews(
  slug: string,
  realViews: number,
  setting: ViewSetting | null
): number {
  if (setting?.mode === "fixed") return setting.value;
  if (setting?.mode === "auto") return climbingViews(setting);
  return baseViews(slug) + realViews;
}
