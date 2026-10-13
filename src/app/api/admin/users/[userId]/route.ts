import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Approve / suspend an account (approval_status), or grant/revoke contributor
// upload access (can_upload). Each call sets one of the two.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as {
    approval_status?: string;
    can_upload?: boolean;
  } | null;

  const update: { approval_status?: string; can_upload?: boolean } = {};

  if (body?.approval_status !== undefined) {
    const status = body.approval_status;
    if (status !== "approved" && status !== "denied" && status !== "pending") {
      return NextResponse.json({ error: "Bad status." }, { status: 400 });
    }
    update.approval_status = status;
  }

  if (body?.can_upload !== undefined) {
    if (typeof body.can_upload !== "boolean") {
      return NextResponse.json({ error: "Bad value." }, { status: 400 });
    }
    update.can_upload = body.can_upload;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Restrict or restore comment visibility. 'own_only' = the account only sees
// its own comments; 'all' = sees everyone's.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as { comments_visibility?: string } | null;
  const value = body?.comments_visibility;
  if (value !== "all" && value !== "own_only") {
    return NextResponse.json({ error: "Bad value." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ comments_visibility: value })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
