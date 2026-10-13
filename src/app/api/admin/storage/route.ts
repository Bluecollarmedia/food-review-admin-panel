import { NextResponse } from "next/server";
import { listFiles } from "@/lib/r2";
import { listAllReviews } from "@/lib/reviews-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFileUrl, smallThumbnailKey } from "@/lib/media-url";

// Read endpoint for the native app: orphaned bucket files (everything in R2
// minus what any review, avatar, or comment references), newest first.
export async function GET() {
  const supabase = createAdminClient();
  const [videos, thumbnails, smallThumbnails, avatars, commentImages, commentVideos, reviews, profilesRes, commentsRes] =
    await Promise.all([
      listFiles("videos/"),
      listFiles("thumbnails/"),
      listFiles("thumbnails-small/"),
      listFiles("avatars/"),
      listFiles("comment-images/"),
      listFiles("comment-videos/"),
      listAllReviews(),
      supabase.from("profiles").select("avatar_key").not("avatar_key", "is", null),
      supabase.from("comments").select("image_key, video_key"),
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
  for (const row of commentsRes.data ?? []) {
    if (row.image_key) inUse.add(row.image_key);
    if (row.video_key) inUse.add(row.video_key);
  }

  // In-use thumbnails still missing their small (640px) copy.
  const smallKeys = new Set(smallThumbnails.map((f) => f.key));
  const missingSmall = [...inUse]
    .filter((key) => key.startsWith("thumbnails/") && !smallKeys.has(smallThumbnailKey(key)))
    .map((key) => ({ key, url: getPublicFileUrl(key) }));

  const allFiles = [...videos, ...thumbnails, ...avatars, ...commentImages, ...commentVideos];
  const orphaned = allFiles
    .filter((f) => !inUse.has(f.key))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .map((f) => ({ ...f, url: getPublicFileUrl(f.key) }));

  const orphanedBytes = orphaned.reduce((sum, f) => sum + f.size, 0);

  return NextResponse.json({
    totalFiles: allFiles.length,
    orphaned,
    orphanedBytes,
    missingSmall,
  });
}
