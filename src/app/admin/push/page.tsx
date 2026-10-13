import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import PushComposer from "@/components/admin/PushComposer";

export const dynamic = "force-dynamic";

export default async function AdminPushPage() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("push_token", "is", null);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        Push Notification
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Send a one-off push notification to everyone who has the app installed and
        notifications enabled — a re-engagement nudge, an announcement, whatever you want.
      </p>

      <div className="mt-6">
        <PushComposer recipientCount={count ?? 0} />
      </div>
    </div>
  );
}
