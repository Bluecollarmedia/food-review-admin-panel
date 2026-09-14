import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicFileUrl } from "@/lib/media-url";
import AdminUsersList, { type AdminUserRow } from "@/components/admin/AdminUsersList";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = createAdminClient();

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 200 }),
    supabase.from("profiles").select("id, display_name, avatar_key, selfie_key, is_admin, approval_status"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users: AdminUserRow[] = (authData?.users ?? [])
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

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        All Accounts
      </h1>
      <p className="mt-1 text-foreground/60">
        Every viewer account that has signed up, {users.length} total.
      </p>

      <AdminUsersList users={users} />
    </div>
  );
}
