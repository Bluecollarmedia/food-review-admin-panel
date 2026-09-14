import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFileUrl } from "@/lib/media-url";

// Read endpoint for the native app: every viewer account, newest first.
export async function GET() {
  const supabase = createAdminClient();

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 200 }),
    supabase.from("profiles").select("id, display_name, avatar_key, selfie_key, is_admin, approval_status"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = (authData?.users ?? [])
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        displayName: profile?.display_name ?? u.email?.split("@")[0] ?? "Unknown",
        avatarUrl: getPublicFileUrl(profile?.avatar_key),
        selfieUrl: getPublicFileUrl(profile?.selfie_key),
        isAdmin: profile?.is_admin ?? false,
        approvalStatus: profile?.approval_status ?? "approved",
        createdAt: u.created_at,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ users });
}
