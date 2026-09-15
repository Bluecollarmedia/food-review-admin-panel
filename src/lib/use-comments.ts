"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./supabase/client";
import { getPublicFileUrl } from "./media-url";
import type { Comment } from "./data";

type Row = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  message: string;
  parent_id: string | null;
  reply_to_id: string | null;
  created_at: string;
  image_key: string | null;
  profiles: { display_name: string; avatar_key: string | null } | null;
};

function authorNameOf(row: Row): string {
  return row.user_id ? row.profiles?.display_name ?? "Deleted user" : row.guest_name ?? "Guest";
}

function toComment(row: Row): Comment {
  return {
    id: row.id,
    message: row.message,
    createdAt: row.created_at,
    authorName: row.user_id
      ? row.profiles?.display_name ?? "Deleted user"
      : row.guest_name ?? "Guest",
    avatarUrl: getPublicFileUrl(row.profiles?.avatar_key),
    imageUrl: getPublicFileUrl(row.image_key),
    isGuest: row.user_id === null,
    userId: row.user_id,
    replies: [],
  };
}

function buildTree(rows: Row[]): Comment[] {
  const byId = new Map<string, Comment>();
  const rowById = new Map<string, Row>();
  rows.forEach((r) => {
    byId.set(r.id, toComment(r));
    rowById.set(r.id, r);
  });

  // Attach the quoted snippet: the exact message each reply is answering. Prefer
  // the stored reply_to_id; for older replies with no target, fall back to
  // matching a leading @Name to an earlier reply in the same thread.
  rows.forEach((r) => {
    if (!r.parent_id) return; // only replies quote
    let target: Row | undefined;
    if (r.reply_to_id && r.reply_to_id !== r.parent_id) {
      target = rowById.get(r.reply_to_id);
    }
    if (!target) {
      const m = r.message.match(/^@(\w+)/);
      if (m) {
        const name = m[1].toLowerCase();
        const matches = rows.filter(
          (o) =>
            o.parent_id === r.parent_id &&
            o.id !== r.id &&
            o.created_at < r.created_at &&
            authorNameOf(o).toLowerCase().startsWith(name)
        );
        target = matches[matches.length - 1];
      }
    }
    if (target && target.id !== r.parent_id) {
      byId.get(r.id)!.quoted = {
        author: authorNameOf(target),
        text: target.message.slice(0, 120),
      };
    }
  });

  const roots: Comment[] = [];
  rows.forEach((r) => {
    const comment = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.replies.push(comment);
    } else if (!r.parent_id) {
      roots.push(comment);
    }
  });

  return roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useComments(slug: string) {
  const [comments, setComments] = useState<Comment[] | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select(
        "id, user_id, guest_name, message, parent_id, reply_to_id, created_at, image_key, profiles(display_name, avatar_key)"
      )
      .eq("slug", slug)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    setComments(buildTree((data as unknown as Row[]) ?? []));
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch(() => {
      if (!cancelled) setComments([]);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { comments, refresh };
}
