export type Comment = {
  id: string;
  message: string;
  createdAt: string;
  authorName: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  isGuest: boolean;
  userId: string | null;
  replies: Comment[];
  /** The specific message this reply is answering, for a quoted snippet. */
  quoted?: { author: string; text: string };
};

export type Reviewer = string;
export type ReviewStatus = "published" | "draft" | "locked" | "vault";

export type Review = {
  slug: string;
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
  /** If set, a second person also reviewed this same video (any name — David, Shmuel, or a guest). */
  secondReviewer?: string;
  secondReviewerVideoKey?: string;
  secondReviewerThumbnailKey?: string;
  secondReviewerRating?: number;
  /** A third person can also review the same video (any name or a guest). */
  thirdReviewer?: string;
  thirdReviewerVideoKey?: string;
  thirdReviewerThumbnailKey?: string;
  thirdReviewerRating?: number;
  /** Show each reviewer's own score on the card, not just the first reviewer's. */
  showBothScores?: boolean;
  /** Slug of an earlier review this one follows up on (a redo/redemption). */
  originalReviewSlug?: string;
  /** Length of the main video in seconds, shown as a duration badge on cards. */
  durationSeconds?: number;
  /** Store location for the map. lat/lng are the pin; mapAddress is a label. */
  lat?: number;
  lng?: number;
  mapAddress?: string;
  createdAt: string;
  updatedAt: string;
  /** Public-facing padded view count, attached when the review is read. */
  displayViews?: number;
};

export const categories = [
  "Pizza",
  "Dairy",
  "Meat",
  "Desserts",
  "Drinks",
] as const;

export const cities = ["Lakewood", "Toms River", "Deal", "Brooklyn"] as const;

export const reviewers: Reviewer[] = ["David", "Shmuel"];

export const prices = ["$", "$$", "$$$"] as const;

/** All reviewers on a review, joined nicely: "David", "David & Shmuel",
 * "David, Shmuel & Chana". */
export function reviewerNames(review: Pick<Review, "reviewer" | "secondReviewer" | "thirdReviewer">): string {
  const names = [review.reviewer, review.secondReviewer, review.thirdReviewer].filter(
    (n): n is string => !!n && n.trim().length > 0
  );
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Seconds -> "m:ss" (or "h:mm:ss"). Returns null for missing/invalid values. */
export function formatDuration(seconds?: number): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 1) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

export function getRelatedReviews(review: Review, pool: Review[], limit = 8) {
  const scored = pool
    .filter((r) => r.slug !== review.slug)
    .map((r) => ({
      review: r,
      score:
        r.categories.filter((c) => review.categories.includes(c)).length +
        (r.city === review.city ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.review);
}
