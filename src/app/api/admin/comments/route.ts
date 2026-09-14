import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllReviews } from "@/lib/reviews-store";
import { getPublicFileUrl } from "@/lib/media-url";

type Row = {
  id: string;
  slug: string;
  user_id: string | null;
  guest_name: string | null;
  message: string;
  parent_id: string | null;
  image_key: string | null;
  created_at: string;
  deleted_at: string | null;
  profiles: { display_name: string; avatar_key: string | null } | null;
};

// Read endpoint for the native app: every comment/reply, newest first.
export async function GET() {
  const supabase = createAdminClient();
  const [{ data }, reviews] = await Promise.all([
    supabase
      .from("comments")
      .select(
        "id, slug, user_id, guest_name, message, parent_id, image_key, created_at, deleted_at, profiles(display_name, avatar_key)"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    listAllReviews(),
  ]);

  const titles = Object.fromEntries(reviews.map((r) => [r.slug, r.title]));
  const rows = (data as unknown as Row[]) ?? [];

  const comments = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    videoTitle: titles[row.slug] ?? row.slug,
    authorName: row.user_id ? row.profiles?.display_name ?? "Deleted user" : row.guest_name ?? "Guest",
    avatarUrl: getPublicFileUrl(row.profiles?.avatar_key),
    imageUrl: getPublicFileUrl(row.image_key),
    message: row.message,
    isReply: !!row.parent_id,
    deleted: !!row.deleted_at,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ comments });
}
