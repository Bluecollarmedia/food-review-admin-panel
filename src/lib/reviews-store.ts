import { unstable_cache } from "next/cache";
import type { Review, ReviewStatus, Reviewer } from "./data";
import { sharedStore } from "./blob-store";
import { getAllViews } from "./views";
import { getAllViewSettings, publicViews } from "./view-counts";

function reviewsStore() {
  return sharedStore("reviews");
}

/**
 * Attach the public-facing padded view count to each review so cards and the
 * video page can show it without every caller having to fetch views itself.
 */
async function withDisplayViews(reviews: Review[]): Promise<Review[]> {
  if (reviews.length === 0) return reviews;
  const slugs = reviews.map((r) => r.slug);
  const [views, settings] = await Promise.all([
    getAllViews(slugs),
    getAllViewSettings(slugs),
  ]);
  return reviews.map((r) => ({
    ...r,
    displayViews: publicViews(r.slug, views[r.slug] ?? 0, settings[r.slug]),
  }));
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Older reviews with an actual split review store the second person's
 * video/rating under legacy shmuel*-prefixed fields (back when the split
 * feature only ever supported David + Shmuel). Map those onto the generic
 * secondReviewer* fields on read so old data keeps working unchanged.
 * A review whose reviewer is just labeled "David & Shmuel" with no actual
 * second video (no split upload) is left alone — that's just a caption,
 * not a split review.
 */
function normalizeReview(raw: Review & { shmuelVideoKey?: string; shmuelThumbnailKey?: string; shmuelRating?: number }): Review {
  if (raw.shmuelVideoKey && !raw.secondReviewerVideoKey) {
    return {
      ...raw,
      reviewer: raw.reviewer === "David & Shmuel" ? "David" : raw.reviewer,
      secondReviewer: raw.reviewer === "David & Shmuel" ? "Shmuel" : raw.secondReviewer,
      secondReviewerVideoKey: raw.shmuelVideoKey,
      secondReviewerThumbnailKey: raw.shmuelThumbnailKey,
      secondReviewerRating: raw.shmuelRating,
    };
  }
  return raw;
}

export async function listAllReviews(): Promise<Review[]> {
  const store = reviewsStore();
  const { blobs } = await store.list();
  const reviews = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<Review>)
  );
  const normalized = reviews
    .filter(Boolean)
    .map(normalizeReview)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return withDisplayViews(normalized);
}

// Kept for parity with the main site; not used by the admin panel directly.
export const listPublishedReviews = unstable_cache(
  async (): Promise<Review[]> => {
    const all = await listAllReviews();
    return all.filter((r) => r.status === "published");
  },
  ["published-reviews"],
  { revalidate: 60 }
);

export async function listLockedReviews(): Promise<Review[]> {
  const all = await listAllReviews();
  return all.filter((r) => r.status === "locked");
}

export async function listVaultReviews(): Promise<Review[]> {
  const all = await listAllReviews();
  return all.filter((r) => r.status === "vault");
}

export async function getReview(slug: string): Promise<Review | null> {
  const store = reviewsStore();
  const review = (await store.get(slug, { type: "json" })) as Review | null;
  if (!review) return null;
  const [enriched] = await withDisplayViews([normalizeReview(review)]);
  return enriched;
}

export async function getPublishedReview(slug: string): Promise<Review | null> {
  const review = await getReview(slug);
  return review && review.status === "published" ? review : null;
}

export type ReviewInput = {
  title: string;
  categories: string[];
  store: string;
  city: string;
  rating: number;
  price?: string;
  description: string;
  reviewer: Reviewer;
  status: ReviewStatus;
  videoKey?: string;
  thumbnailKey?: string;
  secondReviewer?: string;
  secondReviewerVideoKey?: string;
  secondReviewerThumbnailKey?: string;
  secondReviewerRating?: number;
  thirdReviewer?: string;
  thirdReviewerVideoKey?: string;
  thirdReviewerThumbnailKey?: string;
  thirdReviewerRating?: number;
  showBothScores?: boolean;
  originalReviewSlug?: string;
  durationSeconds?: number;
  lat?: number;
  lng?: number;
  mapAddress?: string;
};

export async function createReview(input: ReviewInput): Promise<Review> {
  const store = reviewsStore();
  let slug = slugify(`${input.title}-${input.store}`) || `review-${Date.now()}`;
  let attempt = 0;
  while (await store.get(slug)) {
    attempt += 1;
    slug = `${slugify(`${input.title}-${input.store}`)}-${attempt}`;
  }
  const now = new Date().toISOString();
  const review: Review = { ...input, slug, createdAt: now, updatedAt: now };
  await store.setJSON(slug, review);
  return review;
}

export async function updateReview(
  slug: string,
  input: ReviewInput
): Promise<Review | null> {
  const store = reviewsStore();
  const existing = (await store.get(slug, { type: "json" })) as Review | null;
  if (!existing) return null;
  const updated: Review = {
    ...input,
    slug,
    // Keep a known video length if this edit didn't supply a new one (e.g. the
    // form was saved without re-uploading the video).
    durationSeconds: input.durationSeconds ?? existing.durationSeconds,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await store.setJSON(slug, updated);
  return updated;
}

export async function deleteReview(slug: string): Promise<void> {
  await reviewsStore().delete(slug);
}

/** Backfill the main video's length for a review, but only if it isn't already
 * known — used to fill in durations for older videos as they get watched. */
export async function setReviewDurationIfMissing(
  slug: string,
  seconds: number
): Promise<boolean> {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 36000) return false;
  const store = reviewsStore();
  const existing = (await store.get(slug, { type: "json" })) as Review | null;
  if (!existing || typeof existing.durationSeconds === "number") return false;
  await store.setJSON(slug, { ...existing, durationSeconds: Math.round(seconds) });
  return true;
}
