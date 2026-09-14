import { NextResponse } from "next/server";
import { listFiles } from "@/lib/r2";
import { listAllReviews } from "@/lib/reviews-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFileUrl } from "@/lib/media-url";

// Read endpoint for the native app: orphaned bucket files (everything in R2
// minus what any review, avatar, or comment references), newest first.
export async function GET() {
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

  const inUse = new Set<string>();
  for (const r of reviews) {
    for (const k of [
      r.videoKey,
      r.thumbnailKey,
      r.secondReviewerVideoKey,
      r.secondReviewerThumbnailKey,
      r.thirdReviewerVideoKey,
      r.thirdReviewerThumbnailKey,
    ]) {
      if (k) inUse.add(k);
    }
  }
  for (const row of profilesRes.data ?? []) if (row.avatar_key) inUse.add(row.avatar_key);
  for (const row of commentsRes.data ?? []) if (row.image_key) inUse.add(row.image_key);

  const allFiles = [...videos, ...thumbnails, ...avatars, ...commentImages];
  const orphaned = allFiles
    .filter((f) => !inUse.has(f.key))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .map((f) => ({ ...f, url: getPublicFileUrl(f.key) }));

  const orphanedBytes = orphaned.reduce((sum, f) => sum + f.size, 0);

  return NextResponse.json({
    totalFiles: allFiles.length,
    orphaned,
    orphanedBytes,
  });
}
