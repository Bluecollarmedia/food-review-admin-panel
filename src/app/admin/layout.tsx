import AdminNav from "@/components/admin/AdminNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSettingsUnlocked } from "@/lib/settings-guard";
import { countNewAppeals } from "@/lib/appeals";

// The admin panel always reads live data and sits behind per-request auth, so
// nothing here should be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient();
  const [unreadRes, unlocked, newAppeals, pendingRes] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
    isSettingsUnlocked(),
    countNewAppeals().catch(() => 0),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav
        unreadNotifications={unreadRes.count ?? 0}
        newAppeals={newAppeals}
        pendingAccounts={pendingRes.count ?? 0}
        unlocked={unlocked}
      />
      {children}
    </div>
  );
}
