import { createAdminClient } from "./supabase/admin";

export async function getLockedPasscode(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("locked_passcode")
    .eq("id", 1)
    .single();

  return data?.locked_passcode || process.env.LOCKED_PASSCODE || "";
}

export async function getVaultPasscode(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("locked_passcode_2")
    .eq("id", 1)
    .single();

  return data?.locked_passcode_2 || process.env.VAULT_PASSCODE || "";
}

/**
 * The security passcode that guards the Locked/Vault passcode fields in Admin
 * Settings. Empty means none is configured yet, so those fields are open (this
 * is how the owner sets it for the first time).
 */
export async function getSettingsPasscode(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("settings_passcode")
    .eq("id", 1)
    .single();

  return data?.settings_passcode || process.env.SETTINGS_PASSCODE || "";
}
