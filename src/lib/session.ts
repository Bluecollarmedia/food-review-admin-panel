export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export const LOCKED_SESSION_COOKIE = "locked_session";
export const LOCKED_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export const VAULT_SESSION_COOKIE = "vault_session";
export const VAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export const SITE_LOCK_SESSION_COOKIE = "site_lock_session";
export const SITE_LOCK_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

// The site lock can have more than one valid passcode. Sign the unlock session
// with a secret derived from ALL of them, so a session made from either code
// verifies the same way — and changing the codes invalidates old sessions.
export function siteLockSecret(passcodes: (string | null | undefined)[]): string {
  return "sitelock:" + passcodes.map((p) => (p ?? "").trim()).filter(Boolean).join("|");
}

export const SETTINGS_SESSION_COOKIE = "settings_session";
export const SETTINGS_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function base64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(str: string) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  secret: string,
  maxAgeSeconds: number = ADMIN_SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const payload = JSON.stringify({
    exp: Date.now() + maxAgeSeconds * 1000,
  });
  const payloadB64 = base64url(new TextEncoder().encode(payload));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(payloadB64)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
