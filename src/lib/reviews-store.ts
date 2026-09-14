// DEFERRED BACKEND. Reviews live in Netlify Blobs (getStore("reviews")) on the
// main site — per-site, not connected here yet (see BACKEND_TODO.md). These
// stubs let the admin Reviews UI (list + create/edit form) render and build;
// listing returns nothing and lookups return null until the shared Netlify
// Blobs connection is wired. Create/update/delete happen through the deferred
// /api/admin/reviews routes.

import type { Review } from "./data";

export async function listAllReviews(): Promise<Review[]> {
  return [];
}

export async function getReview(_slug: string): Promise<Review | null> {
  return null;
}
