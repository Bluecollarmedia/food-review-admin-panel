import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/r2";
import { listAllReviews } from "@/lib/reviews-store";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_PREFIXES = ["videos/", "thumbnails/", "avatars/", "comment-images/"];

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";

  if (!key || !ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return NextResponse.json({ error: "Invalid file key." }, { status: 400 });
  }

  // Re-check server-side that nothing actually references this file, in case
  // the admin's list was stale (e.g. it was just attached to something in
  // another tab) — never delete a file that's still in use.
  const supabase = createAdminClient();
  const [reviews, profileMatch, commentMatch] = await Promise.all([
    listAllReviews(),
    supabase.from("profiles").select("id").eq("avatar_key", key).limit(1),
    supabase.from("comments").select("id").eq("image_key", key).limit(1),
  ]);

  const inUse =
    reviews.some(
      (r) =>
        r.videoKey === key ||
        r.thumbnailKey === key ||
        r.secondReviewerVideoKey === key ||
        r.secondReviewerThumbnailKey === key ||
        r.thirdReviewerVideoKey === key ||
        r.thirdReviewerThumbnailKey === key
    ) ||
    (profileMatch.data?.length ?? 0) > 0 ||
    (commentMatch.data?.length ?? 0) > 0;

  if (inUse) {
    return NextResponse.json(
      { error: "This file is now linked to something — refresh and try again." },
      { status: 409 }
    );
  }

  await deleteFile(key);
  return NextResponse.json({ ok: true });
}
