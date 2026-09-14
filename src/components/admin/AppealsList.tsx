"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";
import type { Appeal } from "@/lib/appeals";

type Row = Appeal & { selfieUrl: string | null };

function AppealCard({ appeal, onAction, busy }: { appeal: Row; onAction: (action: string, id: string) => Promise<string | null>; busy: boolean }) {
  const [pin, setPin] = useState<string | null>(null);
  const place = appeal.geo
    ? [appeal.geo.city, appeal.geo.region, appeal.geo.country].filter(Boolean).join(", ")
    : "";

  async function genPin() {
    const p = await onAction("pin", appeal.id);
    if (p) setPin(p);
  }

  return (
    <div className={`rounded-2xl border bg-surface p-4 shadow-sm ${appeal.status === "new" ? "border-primary/40" : "border-border"}`}>
      <div className="flex gap-4">
        {appeal.selfieUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appeal.selfieUrl} alt="selfie" className="h-24 w-24 shrink-0 rounded-xl border border-border object-cover" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-xs text-foreground/40">
            no photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{appeal.name || "Someone"}</span>
            {appeal.status === "new" && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">New</span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${appeal.faceVerified ? "bg-emerald-100 text-emerald-700" : "bg-foreground/10 text-foreground/50"}`}>
              {appeal.faceVerified ? "Face ✓" : "Face not verified"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-foreground/60">
            {relativeTime(appeal.createdAt)} ago
            {appeal.contact ? ` · ${appeal.contact}` : ""}
          </p>
          {appeal.message && <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{appeal.message}</p>}
          {(place || appeal.ip) && (
            <p className="mt-1 text-xs text-foreground/40">
              {appeal.geo?.flag ? `${appeal.geo.flag} ` : "📍 "}{place || "unknown"} · {appeal.ip}
            </p>
          )}
        </div>
      </div>

      {pin && (
        <div className="mt-3 rounded-xl bg-surface-muted px-4 py-3 text-center">
          <p className="text-xs text-foreground/60">One-time unban code (give this to them):</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-foreground">{pin}</p>
          <p className="mt-1 text-[11px] text-foreground/40">Good for 24 hours, works once.</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs font-semibold">
        <button onClick={() => onAction("unban", appeal.id)} disabled={busy} className="rounded-full bg-emerald-600 px-4 py-1.5 text-white hover:opacity-90 disabled:opacity-50">
          Unban
        </button>
        <button onClick={genPin} disabled={busy} className="rounded-full border border-border px-4 py-1.5 text-foreground/70 hover:border-accent hover:text-accent disabled:opacity-50">
          Generate unban code
        </button>
        {appeal.status === "new" && (
          <button onClick={() => onAction("handled", appeal.id)} disabled={busy} className="rounded-full border border-border px-4 py-1.5 text-foreground/60 hover:text-foreground disabled:opacity-50">
            Mark handled
          </button>
        )}
        <button
          onClick={() => { if (confirm("Delete this appeal?")) onAction("delete", appeal.id); }}
          disabled={busy}
          className="rounded-full border border-border px-4 py-1.5 text-primary hover:bg-primary hover:text-white disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AppealsList({ appeals }: { appeals: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onAction(action: string, id: string): Promise<string | null> {
    setBusy(true);
    const res = await fetch("/api/admin/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id }),
    }).catch(() => null);
    setBusy(false);
    const data = res ? await res.json().catch(() => null) : null;
    if (action === "pin") return data?.pin ?? null;
    router.refresh();
    return null;
  }

  if (appeals.length === 0) {
    return <p className="mt-8 text-center text-foreground/60">No appeals yet.</p>;
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {appeals.map((a) => (
        <AppealCard key={a.id} appeal={a} onAction={onAction} busy={busy} />
      ))}
    </div>
  );
}
