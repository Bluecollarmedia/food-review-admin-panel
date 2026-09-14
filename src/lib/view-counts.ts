// DEFERRED BACKEND. View overrides (custom / auto-climb counts) live in Netlify
// Blobs (getStore("view-overrides")) on the main site — per-site, not connected
// here yet (see BACKEND_TODO.md). Stub returns none so the admin UI renders.

import type { ViewSetting } from "./view-format";

export async function getViewSetting(_slug: string): Promise<ViewSetting | null> {
  return null;
}

export async function getAllViewSettings(
  _slugs: string[]
): Promise<Record<string, ViewSetting | null>> {
  return {};
}
