// DEFERRED BACKEND. Real view counts live in Netlify Blobs (getStore("views"))
// on the main site — per-site, not connected here yet (see BACKEND_TODO.md).
// These stubs return empty so the admin UI renders; real counts arrive when the
// shared Netlify Blobs connection is wired.

export async function getViews(_slug: string): Promise<number> {
  return 0;
}

export async function getAllViews(_slugs: string[]): Promise<Record<string, number>> {
  return {};
}
