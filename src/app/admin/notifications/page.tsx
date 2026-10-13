import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllReviews } from "@/lib/reviews-store";
import { relativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const supabase = createAdminClient();

  const [{ data: notifications }, reviews] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("id, type, slug, comment_id, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    listAllReviews(),
  ]);

  const reviewTitles = Object.fromEntries(reviews.map((r) => [r.slug, r.title]));

  const unreadIds = (notifications ?? []).filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length > 0) {
    await supabase.from("admin_notifications").update({ read: true }).in("id", unreadIds);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        Notifications
      </h1>

      {!notifications || notifications.length === 0 ? (
        <p className="mt-12 text-center text-foreground/60">No comment activity yet.</p>
      ) : (
        <div className="mt-4 flex flex-col divide-y divide-border">
          {notifications.map((n) => (
            <div key={n.id} className={`py-3 ${n.read ? "" : "bg-primary/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {n.type === "new_reply" ? "New reply" : "New comment"}
                  <span className="ml-2 font-normal text-foreground/50">
                    on {reviewTitles[n.slug] ?? n.slug}
                  </span>
                </span>
                <span className="text-xs text-foreground/40">{relativeTime(n.created_at)}</span>
              </div>
              <p className="mt-0.5 text-sm text-foreground/70">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
