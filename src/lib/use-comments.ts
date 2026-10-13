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
  video_key: string | null;
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
    videoUrl: getPublicFileUrl(row.video_key),
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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    type Profile = { id: string; display_name: string; avatar_key: string | null };

    // Preferred path: our own server fetches the comments. Phones on mobile
    // data sometimes fail the direct browser-to-Supabase request ("Load failed").
    async function viaServer(): Promise<{ rows: Row[]; profiles: Profile[] }> {
      let res: Response;
      try {
        res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      } catch (err) {
        throw new Error(`request failed (${err instanceof Error ? err.message : String(err)})`);
      }
      const text = await res.text().catch(() => "");
      // Say what actually came back, so a lock/ban screen or something on the
      // network (a filter, VPN or captive portal) swapping in its own page is
      // obvious instead of Safari's "The string did not match the expected pattern".
      const what = () =>
        `HTTP ${res.status}, ${res.headers.get("content-type") ?? "no type"}: ` +
        JSON.stringify(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80));
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`bad reply (${what()})`);
      }
      if (!res.ok) {
        const msg = (body as { error?: unknown } | null)?.error;
        throw new Error(typeof msg === "string" ? `HTTP ${res.status}: ${msg}` : `HTTP ${res.status}`);
      }
      return body as { rows: Row[]; profiles: Profile[] };
    }

    async function viaSupabase(): Promise<{ rows: Row[]; profiles: Profile[] }> {
      const supabase = createClient();
      const { data, error: dbError } = await supabase
        .from("comments")
        .select(
          "id, user_id, guest_name, message, parent_id, reply_to_id, created_at, image_key, video_key"
        )
        .eq("slug", slug)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (dbError) throw new Error(dbError.message);
      const rows = (data as unknown as Row[]) ?? [];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];
      let profiles: Profile[] = [];
      if (userIds.length > 0) {
        const res = await supabase
          .from("profiles")
          .select("id, display_name, avatar_key")
          .in("id", userIds);
        if (res.error) throw new Error(res.error.message);
        profiles = res.data ?? [];
      }
      return { rows, profiles };
    }

    const attempts: [string, () => Promise<{ rows: Row[]; profiles: Profile[] }>][] = [
      // This panel has no public /api/comments route, so only the direct read.
      ["direct", viaSupabase],
    ];
    const failures: string[] = [];
    for (const [label, attempt] of attempts) {
      try {
        const { rows, profiles } = await attempt();
        const byId = new Map(profiles.map((p) => [p.id, p]));
        rows.forEach((r) => {
          r.profiles = r.user_id ? byId.get(r.user_id) ?? null : null;
        });
        setComments(buildTree(rows));
        return;
      } catch (err) {
        failures.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const online = typeof navigator !== "undefined" ? (navigator.onLine ? "online" : "offline") : "?";
    setError(`${failures.join(" | ")} | ${online}`);
    setComments([]);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err) => {
      if (!cancelled) {
        setError(`Fetch error: ${err?.message ?? 'Unknown error'}`);
        setComments([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { comments, refresh, error, slug };
}
