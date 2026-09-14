import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllReviews } from "@/lib/reviews-store";

// Read endpoint for the native app: recent comment/reply notifications, and it
// marks them read on fetch (same as the web page does on view).
export async function GET() {
  const supabase = createAdminClient();
  const [{ data: notifications }, reviews] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("id, type, slug, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    listAllReviews(),
  ]);

  const titles = Object.fromEntries(reviews.map((r) => [r.slug, r.title]));
  const rows = notifications ?? [];

  const unreadIds = rows.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await supabase.from("admin_notifications").update({ read: true }).in("id", unreadIds);
  }

  const items = rows.map((n) => ({
    id: n.id,
    type: n.type,
    videoTitle: titles[n.slug] ?? n.slug,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
  }));

  return NextResponse.json({ notifications: items });
}
