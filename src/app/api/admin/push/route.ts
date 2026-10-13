import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotifications } from "@/lib/push";

// Read endpoint for the native app: how many devices would get a push.
export async function GET() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("push_token", "is", null);
  return NextResponse.json({ recipientCount: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { title?: string; body?: string }
    | null;

  const title = body?.title?.trim();
  const message = body?.body?.trim();
  if (!title || !message) {
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("push_token")
    .not("push_token", "is", null);

  if (error) {
    return NextResponse.json({ error: "Failed to load push tokens." }, { status: 500 });
  }

  const tokens = (profiles ?? [])
    .map((p) => p.push_token as string | null)
    .filter((t): t is string => !!t);

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, recipients: 0, errors: [] });
  }

  const result = await sendPushNotifications(tokens, title, message);
  return NextResponse.json({ ...result, recipients: tokens.length });
}
