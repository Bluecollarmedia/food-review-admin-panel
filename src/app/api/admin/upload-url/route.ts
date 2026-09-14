import { NextRequest, NextResponse } from "next/server";
import { getUploadUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const folder = body?.folder === "thumbnails" ? "thumbnails" : "videos";

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "filename and contentType are required." },
      { status: 400 }
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const key = `${folder}/${crypto.randomUUID()}-${safeName}`;
  // Thumbnails are small, one-shot downloads with a fresh UUID key that's
  // never overwritten in place, so it's safe to cache them indefinitely.
  // Videos are streamed/seeked in pieces rather than fetched once, and a
  // long-lived cache directive interacting with range requests is the
  // likely cause of a real reported bug (pausing then resuming a video
  // stalling for ~15s) — so they're left uncached.
  const cacheControl = folder === "thumbnails" ? "public, max-age=31536000, immutable" : undefined;
  const uploadUrl = await getUploadUrl(key, contentType, cacheControl);

  return NextResponse.json({ uploadUrl, key });
}
