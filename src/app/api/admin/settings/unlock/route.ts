import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SETTINGS_SESSION_COOKIE,
  SETTINGS_SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { getSettingsPasscode } from "@/lib/locked-passcode";
import { checkRateLimit, clearRateLimit, getClientIp, recordFailedAttempt } from "@/lib/rate-limit";

// This route lives under /api/admin, so it's already behind the admin login.
// It grants access to the Locked/Vault passcode fields to whoever also knows
// the separate security passcode.
export async function POST(req: NextRequest) {
  const rateLimitKey = `settings-unlock:${getClientIp(req)}`;
  const { allowed, retryAfterSeconds } = await checkRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil((retryAfterSeconds ?? 60) / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const current = await getSettingsPasscode();
  if (!current) {
    // Nothing configured yet — the fields are already open, nothing to unlock.
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => null);
  const passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";

  if (!passcode || passcode !== current) {
    await recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  await clearRateLimit(rateLimitKey);

  const token = await createSessionToken(current, SETTINGS_SESSION_MAX_AGE_SECONDS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SETTINGS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SETTINGS_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
