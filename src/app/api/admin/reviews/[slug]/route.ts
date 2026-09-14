import { NextRequest, NextResponse } from "next/server";
import { updateReview, deleteReview, getReview, type ReviewInput } from "@/lib/reviews-store";
import { deleteFile } from "@/lib/r2";
import { notifyNewUpload } from "@/lib/notify";
import { getPublicFileUrl } from "@/lib/media-url";
import { isSettingsUnlocked, isProtectedStatus } from "@/lib/settings-guard";

async function deleteIfReplaced(oldKey: string | undefined, newKey: string | undefined) {
  if (oldKey && oldKey !== newKey) {
    await deleteFile(oldKey).catch(() => {});
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as ReviewInput | null;

  if (
    !body ||
    !body.title?.trim() ||
    !body.store?.trim() ||
    !body.city ||
    !body.description?.trim() ||
    !body.reviewer ||
    !Array.isArray(body.categories) ||
    body.categories.length === 0 ||
    typeof body.rating !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const existing = await getReview(slug);

  // A Locked/Vault video can't have its visibility changed (e.g. made public)
  // without the security passcode — otherwise anyone with the shared admin
  // login could just publish protected content and watch it.
  if (
    existing &&
    isProtectedStatus(existing.status) &&
    body.status !== existing.status &&
    !(await isSettingsUnlocked())
  ) {
    return NextResponse.json(
      { error: "This video is in the Locked/Vault. Enter the security passcode in Settings to move it out." },
      { status: 403 }
    );
  }

  const review = await updateReview(slug, body);
  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  await Promise.all([
    deleteIfReplaced(existing?.videoKey, review.videoKey),
    deleteIfReplaced(existing?.thumbnailKey, review.thumbnailKey),
    deleteIfReplaced(existing?.secondReviewerVideoKey, review.secondReviewerVideoKey),
    deleteIfReplaced(existing?.secondReviewerThumbnailKey, review.secondReviewerThumbnailKey),
    deleteIfReplaced(existing?.thirdReviewerVideoKey, review.thirdReviewerVideoKey),
    deleteIfReplaced(existing?.thirdReviewerThumbnailKey, review.thirdReviewerThumbnailKey),
  ]);

  if (review.status === "published" && existing?.status !== "published") {
    notifyNewUpload({
      origin: req.nextUrl.origin,
      slug: review.slug,
      title: review.title,
      store: review.store,
      city: review.city,
      rating: review.rating,
      thumbnailUrl: getPublicFileUrl(review.thumbnailKey),
    }).catch(() => {});
  }

  return NextResponse.json({ review });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const existing = await getReview(slug);

  // Protected videos can't be deleted without the security passcode either —
  // "once it's in the Vault, it stays" unless you have the code.
  if (existing && isProtectedStatus(existing.status) && !(await isSettingsUnlocked())) {
    return NextResponse.json(
      { error: "This video is in the Locked/Vault. Enter the security passcode in Settings to remove it." },
      { status: 403 }
    );
  }

  if (existing?.videoKey) {
    await deleteFile(existing.videoKey).catch(() => {});
  }
  if (existing?.thumbnailKey) {
    await deleteFile(existing.thumbnailKey).catch(() => {});
  }
  if (existing?.secondReviewerVideoKey) {
    await deleteFile(existing.secondReviewerVideoKey).catch(() => {});
  }
  if (existing?.secondReviewerThumbnailKey) {
    await deleteFile(existing.secondReviewerThumbnailKey).catch(() => {});
  }
  if (existing?.thirdReviewerVideoKey) {
    await deleteFile(existing.thirdReviewerVideoKey).catch(() => {});
  }
  if (existing?.thirdReviewerThumbnailKey) {
    await deleteFile(existing.thirdReviewerThumbnailKey).catch(() => {});
  }
  await deleteReview(slug);
  return NextResponse.json({ ok: true });
}
