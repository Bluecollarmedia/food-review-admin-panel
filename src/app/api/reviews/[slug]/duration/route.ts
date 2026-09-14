import { NextRequest, NextResponse } from "next/server";
import { setReviewDurationIfMissing } from "@/lib/reviews-store";

// Public, write-once-if-missing endpoint: the video player posts the measured
// length so older videos (uploaded before durations were captured) get a
// duration badge the first time anyone watches them. It only sets the value
// when it isn't already known and rejects implausible numbers, so there's
// nothing to abuse beyond a single cosmetic field.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const seconds = Number(body?.seconds);

  if (!Number.isFinite(seconds)) {
    return NextResponse.json({ error: "Invalid seconds." }, { status: 400 });
  }

  const updated = await setReviewDurationIfMissing(slug, seconds);
  return NextResponse.json({ updated });
}
