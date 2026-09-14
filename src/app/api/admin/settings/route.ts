import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";
import { SETTINGS_SESSION_COOKIE, verifySessionToken } from "@/lib/session";

function expiryFromDuration(duration: unknown): string | null {
  const now = Date.now();
  if (duration === "24h") return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (duration === "1w") return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  return null; // "none" / anything else = stays until manually removed
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const emailNotifications = typeof body?.emailNotifications === "boolean" ? body.emailNotifications : false;
  const notifyEmail = typeof body?.notifyEmail === "string" ? body.notifyEmail.trim() : "";

  // Passcodes are only touched when the key is present in the request — an
  // absent key means "leave it exactly as it is". A present empty string means
  // "remove it". This lets the form change one code without wiping the others,
  // and without ever having to send the current values back to the browser.
  const lockedProvided = typeof body?.lockedPasscode === "string";
  const vaultProvided = typeof body?.vaultPasscode === "string";
  const settingsProvided = typeof body?.settingsPasscode === "string";
  const lockedPasscode = lockedProvided ? body.lockedPasscode.trim() : "";
  const vaultPasscode = vaultProvided ? body.vaultPasscode.trim() : "";
  const settingsPasscode = settingsProvided ? body.settingsPasscode.trim() : "";

  const bannerMessage = typeof body?.bannerMessage === "string" ? body.bannerMessage.trim() : "";
  const bannerDuration = body?.bannerDuration;

  const rawMode = body?.siteLockMode;
  const siteLockMode = rawMode === "full" || rawMode === "code" ? rawMode : "off";
  const siteLockPasscode = typeof body?.siteLockPasscode === "string" ? body.siteLockPasscode.trim() : "";
  const siteLockPasscode2 = typeof body?.siteLockPasscode2 === "string" ? body.siteLockPasscode2.trim() : "";
  const siteLockHint = typeof body?.siteLockHint === "string" ? body.siteLockHint.trim() : "";
  const requireApproval = body?.requireApproval === true;

  if (siteLockMode === "code" && !siteLockPasscode && !siteLockPasscode2) {
    return NextResponse.json(
      { error: "Enter at least one passcode to lock the site behind a code." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Bump the banner's version only when the message text actually changes, so
  // an unrelated settings save doesn't re-show a banner people already closed.
  const { data: existing } = await supabase
    .from("admin_settings")
    .select("banner_message, banner_updated_at, settings_passcode")
    .eq("id", 1)
    .single();

  // The Locked/Vault/Security passcodes can only be changed by someone who's
  // entered the separate security passcode (or when none is set up yet). Any
  // other admin's save leaves those three fields untouched.
  const currentSettingsPasscode = existing?.settings_passcode || process.env.SETTINGS_PASSCODE || "";
  const settingsUnlocked =
    !currentSettingsPasscode ||
    (await verifySessionToken(req.cookies.get(SETTINGS_SESSION_COOKIE)?.value, currentSettingsPasscode));

  const messageChanged = (existing?.banner_message ?? "") !== bannerMessage;
  const bannerUpdatedAt = !bannerMessage
    ? existing?.banner_updated_at ?? null
    : messageChanged || !existing?.banner_updated_at
    ? new Date().toISOString()
    : existing.banner_updated_at;

  const update: Record<string, unknown> = {
    email_notifications: emailNotifications,
    notify_email: notifyEmail || null,
    banner_message: bannerMessage || null,
    banner_expires_at: bannerMessage ? expiryFromDuration(bannerDuration) : null,
    banner_updated_at: bannerUpdatedAt,
    site_lock_mode: siteLockMode,
    site_lock_passcode: siteLockMode === "code" ? siteLockPasscode || null : null,
    site_lock_passcode_2: siteLockMode === "code" ? siteLockPasscode2 || null : null,
    site_lock_hint: siteLockMode === "code" ? siteLockHint || null : null,
    require_approval: requireApproval,
  };

  if (settingsUnlocked) {
    if (lockedProvided) update.locked_passcode = lockedPasscode || null;
    if (vaultProvided) update.locked_passcode_2 = vaultPasscode || null;
    if (settingsProvided) update.settings_passcode = settingsPasscode || null;
  }

  const { error } = await supabase.from("admin_settings").update(update).eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(SITE_SETTINGS_TAG, "max");
  return NextResponse.json({ ok: true });
}
