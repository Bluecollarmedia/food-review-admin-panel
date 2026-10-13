"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  selfieUrl: string | null;
  isAdmin: boolean;
  approvalStatus: string;
  commentsRestricted: boolean;
  canUpload: boolean;
  createdAt: string;
};

export default function AdminUsersList({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    setConfirmingId(null);
    router.refresh();
  }

  async function setApproval(id: string, status: "approved" | "denied") {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval_status: status }),
    }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  async function setCommentsRestricted(id: string, restricted: boolean) {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments_visibility: restricted ? "own_only" : "all" }),
    }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  async function setCanUpload(id: string, canUpload: boolean) {
    setBusyId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ can_upload: canUpload }),
    }).catch(() => {});
    setBusyId(null);
    router.refresh();
  }

  if (users.length === 0) {
    return <p className="mt-8 text-center text-foreground/60">No accounts yet.</p>;
  }

  return (
    <>
    <div className="mt-6 flex flex-col divide-y divide-border">
      {users.map((u) => {
        const pending = u.approvalStatus === "pending";
        const denied = u.approvalStatus === "denied";
        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 py-4">
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt={u.displayName} loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-light font-display text-white">
                {u.displayName.charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{u.displayName}</span>
                {u.isAdmin && (
                  <span className="rounded-full bg-primary/10 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Admin
                  </span>
                )}
                {pending && (
                  <span className="rounded-full bg-amber-100 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Pending
                  </span>
                )}
                {u.commentsRestricted && (
                  <span className="rounded-full bg-foreground/10 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                    Own comments only
                  </span>
                )}
                {denied && (
                  <span className="rounded-full bg-primary/10 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Denied
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-foreground/50">{u.email}</p>
              <p className="text-[11px] text-foreground/40">Joined {relativeTime(u.createdAt)}</p>
              {u.selfieUrl && (
                <button
                  type="button"
                  onClick={() => setLightbox(u.selfieUrl)}
                  className="mt-2 flex items-center gap-2"
                  title="Tap to enlarge the verification selfie"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.selfieUrl}
                    alt={`${u.displayName} verification selfie`}
                    loading="lazy"
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                  />
                  <span className="text-[11px] font-semibold text-foreground/50">Verification selfie</span>
                </button>
              )}
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
              {u.approvalStatus !== "approved" && (
                <button
                  onClick={() => setApproval(u.id, "approved")}
                  disabled={busyId === u.id}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Approve
                </button>
              )}
              {u.approvalStatus === "approved" && !u.isAdmin && (
                <button
                  onClick={() => setApproval(u.id, "denied")}
                  disabled={busyId === u.id}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:border-primary hover:text-primary disabled:opacity-50"
                  title="Suspend this account — they'll be locked out"
                >
                  Suspend
                </button>
              )}

              {!u.isAdmin && (
                <button
                  onClick={() => setCommentsRestricted(u.id, !u.commentsRestricted)}
                  disabled={busyId === u.id}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:border-primary hover:text-primary disabled:opacity-50"
                  title="When on, this account only sees its own comments (it can still comment)"
                >
                  {u.commentsRestricted ? "Show all comments" : "Restrict comments"}
                </button>
              )}

              {!u.isAdmin && (
                <button
                  onClick={() => setCanUpload(u.id, !u.canUpload)}
                  disabled={busyId === u.id}
                  className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
                    u.canUpload
                      ? "border border-emerald-600 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20"
                      : "border border-border text-foreground/70 hover:border-primary hover:text-primary"
                  }`}
                  title="When on, this account can upload reviews from the upload-only page (not the full admin panel)"
                >
                  {u.canUpload ? "✓ Can upload" : "Allow uploads"}
                </button>
              )}

              {confirmingId === u.id ? (
                <>
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={busyId === u.id}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {busyId === u.id ? "Deleting..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={busyId === u.id}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:border-primary hover:text-primary"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingId(u.id)}
                  className="rounded-full border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Verification selfie"
            className="max-h-[85vh] max-w-full rounded-xl"
          />
        </div>
      )}
    </>
  );
}
