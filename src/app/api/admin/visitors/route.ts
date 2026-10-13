import { NextRequest, NextResponse } from "next/server";
import {
  listVisitors,
  getVisitor,
  getHiddenVisitors,
  hideVisitor,
  unhideVisitor,
  setLabel,
  clearVisitor,
  clearAllVisitors,
  type VisitorRecord,
} from "@/lib/visitors";
import { getBans, banIp, unbanIp, setBanMessage } from "@/lib/bans";
import { listAllReviews } from "@/lib/reviews-store";

// Same as the website's AdminVisitors: login/auth-type pages. A visitor who only
// ever hit these (and has no name) is almost always a bot or a quick test.
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
  if (v.label) return false;
  const hits = v.hits ?? [];
  if (hits.length === 0) return true;
  return hits.every((h) => LOGIN_PATHS.has(h.p.split("?")[0].replace(/\/+$/, "") || "/"));
}

// Read endpoint for the native app. The full log (hundreds of devices with up
// to 150 hits each) is too big for one response, so the list sends each device
// without its hits (plus the login-only flag the web works out from them), and
// ?id=<device> returns that one device's hits for its "Show visits & IPs".
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const [visitor, reviews] = await Promise.all([getVisitor(id), listAllReviews()]);
    if (!visitor) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const videos: Record<string, { title: string; status: string }> = {};
    for (const r of reviews) videos[r.slug] = { title: r.title, status: r.status };
    return NextResponse.json({ hits: visitor.hits.map((h) => ({ p: h.p, t: h.t })), videos });
  }

  const [visitors, hidden, bans] = await Promise.all([listVisitors(), getHiddenVisitors(), getBans()]);
  const rows = visitors.map(({ hits, ...rest }) => ({
    ...rest,
    hitCount: hits.length,
    loginOnly: isLoginOnly({ ...rest, hits }),
  }));
  return NextResponse.json({ visitors: rows, hidden, bannedIps: bans.ips, banMessage: bans.message });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { action?: string; id?: string; ip?: string; ips?: string[]; label?: string; message?: string }
    | null;

  if (!body || !body.action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  switch (body.action) {
    // Site-wide, not tied to a specific visitor.
    case "ban-message":
      await setBanMessage(body.message ?? "");
      return NextResponse.json({ ok: true });
    case "clear-all":
      await clearAllVisitors();
      return NextResponse.json({ ok: true });

    // Device-level actions.
    case "hide":
    case "unhide":
    case "label":
    case "clear": {
      if (!body.id) {
        return NextResponse.json({ error: "Missing id." }, { status: 400 });
      }
      if (body.action === "hide") await hideVisitor(body.id);
      else if (body.action === "unhide") await unhideVisitor(body.id);
      else if (body.action === "label") await setLabel(body.id, body.label ?? "");
      else await clearVisitor(body.id);
      return NextResponse.json({ ok: true });
    }

    // Bans: block the DEVICE id (reliable across IP changes) plus every IP that
    // device has used, as a fallback. Unban clears all of them, so a leftover
    // old IP can't keep someone stuck as "banned". The middleware checks both.
    case "ban":
    case "unban": {
      const targets = [
        ...(body.id ? [body.id] : []),
        ...(body.ip ? [body.ip] : []),
        ...(Array.isArray(body.ips) ? body.ips : []),
      ].filter((v): v is string => typeof v === "string" && v.length > 0);

      if (targets.length === 0) {
        return NextResponse.json({ error: "Missing id or ip." }, { status: 400 });
      }
      const fn = body.action === "ban" ? banIp : unbanIp;
      // De-dupe so we don't hit the same identifier twice.
      for (const t of [...new Set(targets)]) await fn(t);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
