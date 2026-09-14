import Link from "next/link";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select(
      "email_notifications, notify_email, locked_passcode, locked_passcode_2, settings_passcode, banner_message, banner_expires_at, site_lock_mode, site_lock_passcode, site_lock_passcode_2, site_lock_hint, require_approval"
    )
    .eq("id", 1)
    .single();

  const mode = data?.site_lock_mode;
  const siteLockMode = mode === "full" || mode === "code" ? mode : "off";

  // The Locked/Vault passcodes are only revealed to someone who's entered the
  // separate security passcode. If none is configured yet, they're open so the
  // owner can set one for the first time.
  const settingsPasscode = data?.settings_passcode || process.env.SETTINGS_PASSCODE || "";
  let unlocked = !settingsPasscode;
  if (!unlocked) {
    const token = (await cookies()).get(SETTINGS_SESSION_COOKIE)?.value;
    unlocked = await verifySessionToken(token, settingsPasscode);
  }

  // We only tell the browser WHETHER each passcode is set, never the value
  // itself — the codes never leave the server.
  const lockedSet = !!(data?.locked_passcode || process.env.LOCKED_PASSCODE);
  const vaultSet = !!(data?.locked_passcode_2 || process.env.VAULT_PASSCODE);
  const settingsSet = !!settingsPasscode;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">Settings</h1>

      <AdminSettingsForm
        initialEmailNotifications={data?.email_notifications ?? false}
        initialNotifyEmail={data?.notify_email ?? ""}
        initialUnlocked={unlocked}
        lockedPasscodeSet={lockedSet}
        vaultPasscodeSet={vaultSet}
        settingsPasscodeSet={settingsSet}
        initialBannerMessage={data?.banner_message ?? ""}
        initialBannerExpiresAt={data?.banner_expires_at ?? null}
        initialSiteLockMode={siteLockMode}
        initialSiteLockPasscode={data?.site_lock_passcode ?? ""}
        initialSiteLockPasscode2={data?.site_lock_passcode_2 ?? ""}
        initialSiteLockHint={data?.site_lock_hint ?? ""}
        initialRequireApproval={data?.require_approval ?? false}
      />
    </div>
  );
}
