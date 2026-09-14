"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPublicFileUrl } from "@/lib/media-url";
import { relativeTime } from "@/lib/time";

const PAGE_SIZE = 40;

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

export default function AdminAllComments({ reviewTitles }: { reviewTitles: Record<string, string> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (offset: number) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select(
        "id, slug, user_id, guest_name, message, parent_id, image_key, created_at, deleted_at, profiles(display_name, avatar_key)"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const batch = (data as unknown as Row[]) ?? [];
    setHasMore(batch.length === PAGE_SIZE);
    return batch;
  }, []);

  useEffect(() => {
    load(0).then((batch) => {
      setRows(batch);
      setLoading(false);
    });
  }, [load]);

  async function loadMore() {
    const batch = await load(rows.length);
    setRows((prev) => [...prev, ...batch]);
  }

  async function handleDelete(row: Row) {
    if (!confirm("Delete this comment? It'll be hidden from the site but you'll still see it here, marked deleted.")) return;
    setBusyId(row.id);
    await fetch(`/api/admin/comments/${row.slug}/${row.id}`, { method: "DELETE" });
    const now = new Date().toISOString();
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, deleted_at: now } : r)));
    setBusyId(null);
  }

  if (loading) {
    return <p className="mt-8 text-sm text-foreground/60">Loading comments...</p>;
  }

  if (rows.length === 0) {
    return <p className="mt-8 text-center text-foreground/60">No comments yet.</p>;
  }

  return (
    <div className="mt-6 flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const authorName = row.user_id
          ? row.profiles?.display_name ?? "Deleted user"
          : row.guest_name ?? "Guest";
        const avatarUrl = getPublicFileUrl(row.profiles?.avatar_key);
        const imageUrl = getPublicFileUrl(row.image_key);
        const videoTitle = reviewTitles[row.slug] ?? row.slug;

        const deleted = !!row.deleted_at;

        return (
          <div key={row.id} className={`flex items-start gap-3 py-4 ${deleted ? "opacity-60" : ""}`}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={authorName} loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light font-display text-white">
                {authorName.charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{authorName}</span>
                {row.parent_id && (
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
                    Reply
                  </span>
                )}
                {deleted && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Deleted
                  </span>
                )}
                <span className="text-xs text-foreground/40">{relativeTime(row.created_at)}</span>
              </div>

              {row.message && (
                <p className="mt-0.5 break-words text-sm text-foreground/80">{row.message}</p>
              )}
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Attached photo" loading="lazy" className="mt-1.5 h-16 w-16 rounded-lg object-cover" />
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-foreground/50">{videoTitle}</span>
                {!deleted && (
                  <button
                    onClick={() => handleDelete(row)}
                    disabled={busyId === row.id}
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={loadMore}
          className="self-center py-4 text-sm font-semibold text-primary hover:underline"
        >
          Load more comments
        </button>
      )}
    </div>
  );
}
