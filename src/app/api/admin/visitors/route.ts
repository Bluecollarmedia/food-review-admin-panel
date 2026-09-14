import { NextRequest, NextResponse } from "next/server";
import {
  hideVisitor,
  unhideVisitor,
  setLabel,
  clearVisitor,
  clearAllVisitors,
} from "@/lib/visitors";
import { banIp, unbanIp, setBanMessage } from "@/lib/bans";

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
