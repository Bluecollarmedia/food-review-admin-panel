"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";
import type { VisitorRecord, VisitorLocation } from "@/lib/visitors";

function fullTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function prettySlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Auth/login-type pages. A visitor who only ever hit these (and has no name) is
// almost always a bot or a quick test — worth tucking away.
const LOGIN_PATHS = new Set([
  "/login",
  "/signup",
  "/admin/login",
  "/locked/login",
  "/locked/vault/login",
  "/site-locked",
  "/reset-password",
  "/pending",
]);
function isLoginOnly(v: VisitorRecord): boolean {
  if (v.label) return false; // a named visitor is never hidden
  const hits = v.hits ?? [];
  if (hits.length === 0) return true;
  return hits.every((h) => {
    const clean = h.p.split("?")[0].replace(/\/+$/, "") || "/";
    return LOGIN_PATHS.has(clean);
  });
}

type VideoMeta = Record<string, { title: string; status: string }>;

// Turn a raw URL path into a plain-English "what they did" line.
function describePath(path: string, videos: VideoMeta): { icon: string; label: string } {
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";

  const simple: Record<string, { icon: string; label: string }> = {
    "/": { icon: "🏠", label: "Home page" },
    "/reviews": { icon: "📋", label: "Browsed all reviews" },
    "/shorts": { icon: "▶️", label: "Shorts feed" },
    "/about": { icon: "ℹ️", label: "About page" },
    "/history": { icon: "🕘", label: "Watch history" },
    "/locked": { icon: "🔒", label: "Opened the Locked list" },
    "/locked/login": { icon: "🔒", label: "Locked login" },
    "/locked/vault": { icon: "🗝️", label: "Opened the Vault list" },
    "/locked/vault/login": { icon: "🗝️", label: "Vault login" },
    "/notifications": { icon: "🔔", label: "Notifications" },
    "/settings": { icon: "⚙️", label: "Account settings" },
    "/login": { icon: "👤", label: "Log in page" },
    "/signup": { icon: "👤", label: "Sign up page" },
  };
  if (simple[clean]) return simple[clean];

  const comments = clean.match(/^\/videos\/([^/]+)\/comments$/);
  if (comments) {
    const t = videos[comments[1]]?.title || prettySlug(comments[1]);
    return { icon: "💬", label: `Comments on “${t}”` };
  }
  const video = clean.match(/^\/videos\/([^/]+)$/);
  if (video) {
    const meta = videos[video[1]];
    const t = meta?.title || prettySlug(video[1]);
    if (meta?.status === "vault") return { icon: "🗝️", label: `Watched Vault video “${t}”` };
    if (meta?.status === "locked") return { icon: "🔒", label: `Watched Locked video “${t}”` };
    return { icon: "🎬", label: `Watched “${t}”` };
  }

  return { icon: "•", label: clean };
}

type Hit = { p: string; t: string };
type Visit = { end: string; start: string; hits: Hit[] };

// Group a flat activity list into "visits" (sessions): consecutive actions are
// the same visit unless there's a gap of more than 30 minutes. Newest first.
const VISIT_GAP_MS = 30 * 60 * 1000;
function groupVisits(hits: Hit[]): Visit[] {
  const sorted = [...hits].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  const visits: Visit[] = [];
  for (const h of sorted) {
    const last = visits[visits.length - 1];
    if (last && new Date(last.start).getTime() - new Date(h.t).getTime() <= VISIT_GAP_MS) {
      last.hits.push(h);
      last.start = h.t;
    } else {
      visits.push({ end: h.t, start: h.t, hits: [h] });
    }
  }
  return visits;
}

// One collapsible visit: shows when it happened + how many actions, expands to
// reveal what they did in that session.
function VisitItem({
  visit,
  videos,
  defaultOpen = false,
}: {
  visit: Visit;
  videos: VideoMeta;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-foreground/80">{fullTime(visit.end)}</span>
        <span className="flex items-center gap-1 text-[11px] text-foreground/40">
          {visit.hits.length} {visit.hits.length === 1 ? "action" : "actions"}
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
          {visit.hits.map((hit, i) => {
            const d = describePath(hit.p, videos);
            return (
              <li key={i} className="flex items-start justify-between gap-3 text-xs">
                <span className="min-w-0 text-foreground/80">
                  <span className="mr-1">{d.icon}</span>
                  {d.label}
                </span>
                <span className="shrink-0 text-foreground/40">{fullTime(hit.t)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function placeLabel(loc: VisitorLocation | undefined): string {
  if (!loc?.geo) return loc?.ip || "unknown";
  const { geo } = loc;
  const place = [geo.city, geo.region, geo.country].filter(Boolean).join(", ");
  return `${geo.flag ? geo.flag + " " : ""}${place || loc.ip}`;
}

function LocationLine({ loc }: { loc: VisitorLocation }) {
  const provider = loc.geo?.isp || loc.geo?.org;
  const hasCoords = typeof loc.geo?.lat === "number" && typeof loc.geo?.lon === "number";
  return (
    <div className="text-xs">
      <p className="font-medium text-foreground/80">{placeLabel(loc)}</p>
      <p className="flex flex-wrap items-center gap-x-2 text-foreground/50">
        <span className="font-mono">{loc.ip}</span>
        {provider && <span>&middot; {provider}</span>}
        {hasCoords && (
          <>
            <span>&middot;</span>
            <a
              href={`https://www.google.com/maps?q=${loc.geo!.lat},${loc.geo!.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              map
            </a>
          </>
        )}
      </p>
    </div>
  );
}

function VisitorRow({
  visitor,
  isMe,
  hidden,
  banned,
  videos,
  onAction,
  busy,
}: {
  visitor: VisitorRecord;
  isMe: boolean;
  hidden: boolean;
  banned: boolean;
  videos: VideoMeta;
  onAction: (action: string, opts: { id?: string; ip?: string; ips?: string[]; label?: string }) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState(visitor.label ?? "");
  const [shownVisits, setShownVisits] = useState(3);
  const visits = groupVisits(visitor.hits);

  const locations = visitor.locations ?? [];
  const primary = locations[0];
  const topIp = primary?.ip;

  return (
    <div
      className={`rounded-2xl border bg-surface p-4 shadow-sm ${
        hidden ? "border-dashed border-border opacity-60" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {visitor.label || (isMe ? "This device" : "Visitor")}
            </span>
            {isMe && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                This is you
              </span>
            )}
            {banned && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Banned
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-foreground/60">
            Last seen {relativeTime(visitor.lastSeen)} ago &middot; {visitor.count}{" "}
            {visitor.count === 1 ? "visit" : "visits"}
          </p>
          {primary && (
            <div className="mt-1.5">
              <LocationLine loc={primary} />
              {locations.length > 1 && (
                <p className="mt-0.5 text-[11px] text-foreground/40">
                  Seen from {locations.length} different IPs/places (cellular usually
                  means one phone hopping IPs).
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setEditingLabel((v) => !v)}
            className="text-foreground/60 hover:text-primary"
          >
            {visitor.label ? "Rename" : "Name it"}
          </button>
          {hidden ? (
            <button
              onClick={() => onAction("unhide", { id: visitor.id })}
              disabled={busy}
              className="text-foreground/60 hover:text-accent disabled:opacity-50"
            >
              Unhide
            </button>
          ) : (
            <button
              onClick={() => onAction("hide", { id: visitor.id })}
              disabled={busy}
              className="text-foreground/60 hover:text-accent disabled:opacity-50"
            >
              Hide
            </button>
          )}
          {banned ? (
            <button
              onClick={() => onAction("unban", { id: visitor.id, ips: locations.map((l) => l.ip) })}
              disabled={busy}
              className="text-foreground/60 hover:text-emerald-600 disabled:opacity-50"
            >
              Unban
            </button>
          ) : (
            <button
              onClick={() => {
                if (
                  confirm(
                    "Ban this device? They'll see your ban message on every page. (They could still get back in by clearing their browser data or using a different device.)"
                  )
                )
                  onAction("ban", { id: visitor.id, ips: locations.map((l) => l.ip) });
              }}
              disabled={busy}
              className="text-primary hover:underline disabled:opacity-50"
            >
              Ban
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this device's history?")) onAction("clear", { id: visitor.id });
            }}
            disabled={busy}
            className="text-foreground/60 hover:text-primary disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {editingLabel && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="e.g. Me, Shmuel, Mom..."
            className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              onAction("label", { id: visitor.id, label: labelInput });
              setEditingLabel(false);
            }}
            disabled={busy}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setLabelInput(visitor.label ?? "");
              setEditingLabel(false);
            }}
            className="text-xs font-semibold text-foreground/50 hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-semibold text-primary hover:underline"
      >
        {expanded ? "Hide details" : "Show visits & IPs"}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-2">
          {locations.length > 1 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
                IPs / places used
              </p>
              <div className="flex flex-col gap-1.5">
                {locations.map((loc) => (
                  <LocationLine key={loc.ip} loc={loc} />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
              Visits ({visits.length}) — tap one to see what they did
            </p>
            <div className="flex flex-col gap-2">
              {visits.slice(0, shownVisits).map((visit, i) => (
                <VisitItem key={visit.end + i} visit={visit} videos={videos} defaultOpen={i === 0} />
              ))}
            </div>
            {visits.length > shownVisits && (
              <button
                onClick={() => setShownVisits((n) => n + 3)}
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Show more visits ({visits.length - shownVisits} older)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminVisitors({
  visitors,
  hidden,
  bannedIps,
  banMessage,
  videos,
}: {
  visitors: VisitorRecord[];
  hidden: string[];
  bannedIps: string[];
  banMessage: string;
  videos: VideoMeta;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showLoginOnly, setShowLoginOnly] = useState(false);
  const [messageInput, setMessageInput] = useState(banMessage);
  const [myId, setMyId] = useState("");

  useEffect(() => {
    try {
      setMyId(localStorage.getItem("dsfr_vid") ?? "");
    } catch {
      // ignore
    }
  }, []);

  async function onAction(action: string, opts: { id?: string; ip?: string; ips?: string[]; label?: string }) {
    setBusy(true);
    await fetch("/api/admin/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...opts }),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  async function saveBanMessage() {
    setBusy(true);
    await fetch("/api/admin/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban-message", message: messageInput }),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  async function clearAll() {
    if (!confirm("Clear the entire visitor log? This can't be undone.")) return;
    setBusy(true);
    await fetch("/api/admin/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-all" }),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  const hiddenSet = new Set(hidden);
  const bannedSet = new Set(bannedIps);
  const isBanned = (v: VisitorRecord) =>
    bannedSet.has(v.id) || (v.locations ?? []).some((l) => bannedSet.has(l.ip));
  const notHidden = visitors.filter((v) => !hiddenSet.has(v.id));
  const hiddenVisitors = visitors.filter((v) => hiddenSet.has(v.id));

  // Login-only visitors (bots/tests) get tucked into a dropdown. Everyone else
  // is shown, with named visitors floated to the top and the rest by recency.
  const loginOnlyVisitors = notHidden.filter(isLoginOnly);
  const visible = notHidden
    .filter((v) => !isLoginOnly(v))
    .sort((a, b) => {
      const aNamed = a.label ? 0 : 1;
      const bNamed = b.label ? 0 : 1;
      if (aNamed !== bNamed) return aNamed - bNamed;
      return b.lastSeen.localeCompare(a.lastSeen);
    });

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <label className="text-sm font-semibold text-foreground">
          Message shown to banned visitors
        </label>
        <p className="mt-0.5 text-xs text-foreground/50">
          Anyone you ban (by IP) is blocked from the whole site and sees this on a branded page.
        </p>
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          rows={3}
          placeholder="e.g. You've been blocked from D&S Food Reviews."
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={saveBanMessage}
          disabled={busy || messageInput === banMessage}
          className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          Save message
        </button>
      </div>

      {visitors.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/50">
            {visitors.length} {visitors.length === 1 ? "device" : "devices"} logged
          </p>
          <button
            onClick={clearAll}
            disabled={busy}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            Clear all history
          </button>
        </div>
      )}

      {notHidden.length === 0 && (
        <p className="text-center text-foreground/60">
          No visitors logged yet. As people browse the site, their devices show up here.
        </p>
      )}
      {visible.length === 0 && loginOnlyVisitors.length > 0 && (
        <p className="text-center text-sm text-foreground/50">
          Only login-page visitors so far — see them in the dropdown below.
        </p>
      )}

      {visible.map((v) => (
        <VisitorRow
          key={v.id}
          visitor={v}
          isMe={!!myId && v.id === myId}
          hidden={false}
          banned={isBanned(v)}
          videos={videos}
          onAction={onAction}
          busy={busy}
        />
      ))}

      {loginOnlyVisitors.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowLoginOnly((v) => !v)}
            className="text-sm font-semibold text-foreground/60 hover:text-primary"
          >
            {showLoginOnly ? "Hide" : "Show"} login-only visitors ({loginOnlyVisitors.length}) —
            mostly bots &amp; tests
          </button>
          {showLoginOnly && (
            <div className="mt-3 flex flex-col gap-4">
              {loginOnlyVisitors.map((v) => (
                <VisitorRow
                  key={v.id}
                  visitor={v}
                  isMe={!!myId && v.id === myId}
                  hidden={false}
                  banned={isBanned(v)}
                  videos={videos}
                  onAction={onAction}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {hiddenVisitors.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-sm font-semibold text-foreground/60 hover:text-primary"
          >
            {showHidden ? "Hide" : "Show"} hidden devices ({hiddenVisitors.length})
          </button>
          {showHidden && (
            <div className="mt-3 flex flex-col gap-4">
              {hiddenVisitors.map((v) => (
                <VisitorRow
                  key={v.id}
                  visitor={v}
                  isMe={!!myId && v.id === myId}
                  hidden={true}
                  banned={isBanned(v)}
                  videos={videos}
                  onAction={onAction}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
