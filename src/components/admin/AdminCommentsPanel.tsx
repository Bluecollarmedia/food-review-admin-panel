"use client";

import { useState } from "react";
import { useComments } from "@/lib/use-comments";
import { relativeTime } from "@/lib/time";
import type { Comment } from "@/lib/data";

export default function AdminCommentsPanel({ slug }: { slug: string }) {
  const { comments, refresh } = useComments(slug);
  const [busyId, setBusyId] = useState<string | null>(null);
  const count = comments?.reduce((sum, c) => sum + 1 + c.replies.length, 0) ?? 0;

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    setBusyId(commentId);
    await fetch(`/api/admin/comments/${slug}/${commentId}`, { method: "DELETE" });
    await refresh();
    setBusyId(null);
  }

  function renderComment(c: Comment, indent = false) {
    return (
      <div className={`flex items-start justify-between gap-3 py-3 ${indent ? "pl-6" : ""}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold text-foreground ${indent ? "text-xs" : "text-sm"}`}>
              {c.authorName}
            </span>
            <span className="text-xs text-foreground/40">{relativeTime(c.createdAt)}</span>
            {c.isGuest && (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/50">
                Guest
              </span>
            )}
          </div>
          {c.message && (
            <p className={`mt-0.5 text-foreground/80 ${indent ? "text-xs" : "text-sm"}`}>{c.message}</p>
          )}
          {c.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt="Attached photo" loading="lazy" className="mt-1.5 h-16 w-16 rounded-lg object-cover" />
          )}
        </div>
        <button
          onClick={() => handleDelete(c.id)}
          disabled={busyId === c.id}
          className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-2xl tracking-wide text-foreground">
        Comments {comments ? `(${count})` : ""}
      </h2>

      <div className="mt-2 flex flex-col divide-y divide-border">
        {comments === null && (
          <p className="py-3 text-sm text-foreground/60">Loading comments...</p>
        )}
        {comments?.map((c) => (
          <div key={c.id}>
            {renderComment(c)}
            {c.replies.map((r) => (
              <div key={r.id} className="border-t border-border/60">
                {renderComment(r, true)}
              </div>
            ))}
          </div>
        ))}
        {comments?.length === 0 && (
          <p className="py-3 text-sm text-foreground/60">No comments on this review yet.</p>
        )}
      </div>
    </div>
  );
}
