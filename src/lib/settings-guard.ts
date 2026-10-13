import { cookies, headers } from "next/headers";
import { ADMIN_SESSION_COOKIE, SETTINGS_SESSION_COOKIE, verifySessionToken } from "./session";
import { getSettingsPasscode } from "./locked-passcode";

/**
 * Whether the current request is allowed to touch protected things (the
 * Locked/Vault passcodes, and moving videos in/out of Locked or Vault).
 * True when the security passcode has been entered this session, or when no
 * security passcode is configured yet.
 */
export async function isSettingsUnlocked(): Promise<boolean> {
  if (await isNativeAppRequest()) return true;
  const passcode = await getSettingsPasscode();
  if (!passcode) return true;
  const token = (await cookies()).get(SETTINGS_SESSION_COOKIE)?.value;
  return verifySessionToken(token, passcode);
}

export function isProtectedStatus(status: string | undefined): boolean {
  return status === "locked" || status === "vault";
}

/**
 * The native app (admin token in a header, no browser cookie) gets full access
 * with just the admin login. The proxy has already verified that token.
 */
export async function isNativeAppRequest(): Promise<boolean> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return !cookieStore.get(ADMIN_SESSION_COOKIE)?.value && !!headerStore.get("x-admin-token");
}
