import { NextRequest, NextResponse } from "next/server";
import { getReview, updateReview } from "@/lib/reviews-store";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const review = await getReview(slug);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const updated = await updateReview(slug, {
    ...review,
    excludeFromRankings: !review.excludeFromRankings,
  });

  return NextResponse.json({ review: updated });
}
