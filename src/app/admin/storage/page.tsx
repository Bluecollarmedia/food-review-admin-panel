import Link from "next/link";
import { listFiles } from "@/lib/r2";
import { listAllReviews } from "@/lib/reviews-store";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminStorageList from "@/components/admin/AdminStorageList";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default async function AdminStoragePage() {
  const supabase = createAdminClient();

  const [videos, thumbnails, avatars, commentImages, reviews, profilesRes, commentsRes] =
    await Promise.all([
      listFiles("videos/"),
      listFiles("thumbnails/"),
      listFiles("avatars/"),
      listFiles("comment-images/"),
      listAllReviews(),
      supabase.from("profiles").select("avatar_key").not("avatar_key", "is", null),
      supabase.from("comments").select("image_key").not("image_key", "is", null),
    ]);

  const inUseKeys = new Set<string>();
  for (const review of reviews) {
    if (review.videoKey) inUseKeys.add(review.videoKey);
    if (review.thumbnailKey) inUseKeys.add(review.thumbnailKey);
    if (review.secondReviewerVideoKey) inUseKeys.add(review.secondReviewerVideoKey);
    if (review.secondReviewerThumbnailKey) inUseKeys.add(review.secondReviewerThumbnailKey);
    if (review.thirdReviewerVideoKey) inUseKeys.add(review.thirdReviewerVideoKey);
    if (review.thirdReviewerThumbnailKey) inUseKeys.add(review.thirdReviewerThumbnailKey);
  }
  for (const row of profilesRes.data ?? []) {
    if (row.avatar_key) inUseKeys.add(row.avatar_key);
  }
  for (const row of commentsRes.data ?? []) {
    if (row.image_key) inUseKeys.add(row.image_key);
  }

  const allFiles = [...videos, ...thumbnails, ...avatars, ...commentImages];
  const orphaned = allFiles
    .filter((f) => !inUseKeys.has(f.key))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified));

  const orphanedBytes = orphaned.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl tracking-wide text-foreground">Storage</h1>
        <Link
          href="/admin/compress"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:border-primary hover:text-primary"
        >
          Compress videos &rarr;
        </Link>
      </div>
      <p className="mt-1 text-foreground/60">
        {allFiles.length} files in the bucket (videos, thumbnails, avatars, comment photos)
        &middot; {orphaned.length} not linked to anything, using {formatBytes(orphanedBytes)}.
      </p>

      {orphaned.length === 0 ? (
        <p className="mt-8 text-center text-foreground/60">
          Nothing unused — every file in the bucket is linked to something.
        </p>
      ) : (
        <div className="mt-6">
          <AdminStorageList files={orphaned} />
        </div>
      )}
    </div>
  );
}
