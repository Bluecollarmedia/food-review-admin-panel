import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = createAdminClient();

  // Soft-delete: stamp deleted_at on the comment and its replies instead of
  // removing them, so the owner can still see deleted comments in the admin
  // panel. Public views filter deleted rows out.
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .or(`id.eq.${commentId},parent_id.eq.${commentId}`)
    .is("deleted_at", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
