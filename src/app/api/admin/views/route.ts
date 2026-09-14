import { NextRequest, NextResponse } from "next/server";
import {
  setFixedViews,
  setClimbingViews,
  clearViewSetting,
} from "@/lib/view-counts";

// Change the public-facing (padded) view count for a review. The real view
// count is never touched — this only changes what visitors see.
//   { slug, action: "reset" }                 -> automatic (start # + real views)
//   { slug, action: "fixed", value }          -> exact number
//   { slug, action: "climb", from, target }   -> YouTube-style auto-climb to target
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { slug?: string; action?: string; value?: number; from?: number; target?: number }
    | null;

  if (!body || !body.slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  switch (body.action) {
    case "reset":
      await clearViewSetting(body.slug);
      return NextResponse.json({ ok: true });

    case "fixed": {
      const value = Number(body.value);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Enter a valid number." }, { status: 400 });
      }
      await setFixedViews(body.slug, value);
      return NextResponse.json({ ok: true });
    }

    case "climb": {
      const target = Number(body.target);
      const from = Number(body.from);
      if (!Number.isFinite(target) || target < 0) {
        return NextResponse.json({ error: "Enter a valid target." }, { status: 400 });
      }
      await setClimbingViews(body.slug, Number.isFinite(from) ? from : 0, target);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
