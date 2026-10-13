import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countNewAppeals } from "@/lib/appeals";

// Read endpoint for the native app: the badge counts the admin tab bar shows
// (same numbers as the web panel's layout).
export async function GET() {
  const supabase = createAdminClient();
  const [unreadRes, newAppeals, pendingRes] = await Promise.all([
    supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
    countNewAppeals().catch(() => 0),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "pending"),
  ]);

  return NextResponse.json({
    unreadNotifications: unreadRes.count ?? 0,
    newAppeals,
    pendingAccounts: pendingRes.count ?? 0,
  });
}
