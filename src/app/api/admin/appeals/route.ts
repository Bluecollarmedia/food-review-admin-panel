import { NextRequest, NextResponse } from "next/server";
import { getAppeal, setAppealStatus, deleteAppeal, createUnbanPin } from "@/lib/appeals";
import { unbanIp } from "@/lib/bans";
import { deleteFile } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { action?: string; id?: string }
    | null;

  if (!body?.action || !body.id) {
    return NextResponse.json({ error: "Missing action or id." }, { status: 400 });
  }

  const appeal = await getAppeal(body.id);
  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found." }, { status: 404 });
  }

  switch (body.action) {
    case "unban": {
      const targets = [appeal.deviceId, ...(appeal.ips ?? [])].filter(Boolean);
      for (const t of [...new Set(targets)]) await unbanIp(t);
      await setAppealStatus(appeal.id, "handled");
      return NextResponse.json({ ok: true });
    }
    case "pin": {
      const pin = await createUnbanPin(appeal.deviceId, appeal.ips ?? []);
      return NextResponse.json({ ok: true, pin });
    }
    case "handled":
      await setAppealStatus(appeal.id, "handled");
      return NextResponse.json({ ok: true });
    case "delete":
      if (appeal.selfieKey) await deleteFile(appeal.selfieKey).catch(() => {});
      await deleteAppeal(appeal.id);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
