import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFileUrl } from "@/lib/media-url";

type Row = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  message: string;
  parent_id: string | null;
  created_at: string;
  image_key: string | null;
  profiles: { display_name: string; avatar_key: string | null } | null;
};

type CommentNode = {
  id: string;
  message: string;
  createdAt: string;
  authorName: string;
  avatarUrl: string | null;
  imageUrl: string | null;
  isGuest: boolean;
  replies: CommentNode[];
};

// Read endpoint for the native app: the threaded comment list for one review
// (non-deleted only), for the per-review moderation panel on Edit Review.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("comments")
    .select("id, user_id, guest_name, message, parent_id, created_at, image_key, profiles(display_name, avatar_key)")
    .eq("slug", slug)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const rows = (data as unknown as Row[]) ?? [];
  const byId = new Map<string, CommentNode>();
  rows.forEach((r) => {
    byId.set(r.id, {
      id: r.id,
      message: r.message,
      createdAt: r.created_at,
      authorName: r.user_id ? r.profiles?.display_name ?? "Deleted user" : r.guest_name ?? "Guest",
      avatarUrl: getPublicFileUrl(r.profiles?.avatar_key),
      imageUrl: getPublicFileUrl(r.image_key),
      isGuest: r.user_id === null,
      replies: [],
    });
  });

  const roots: CommentNode[] = [];
  rows.forEach((r) => {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id)!.replies.push(node);
    else if (!r.parent_id) roots.push(node);
  });
  roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ comments: roots });
}
