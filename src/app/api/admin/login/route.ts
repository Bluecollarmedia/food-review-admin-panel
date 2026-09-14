import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { checkRateLimit, clearRateLimit, getClientIp, recordFailedAttempt } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitKey = `admin-login:${getClientIp(req)}`;
  const { allowed, retryAfterSeconds } = await checkRateLimit(rateLimitKey);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil((retryAfterSeconds ?? 60) / 60)} minute(s).` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (
    !username ||
    !password ||
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    await recordFailedAttempt(rateLimitKey);
    return NextResponse.json(
      { error: "Incorrect username or password." },
      { status: 401 }
    );
  }

  await clearRateLimit(rateLimitKey);

  const token = await createSessionToken(process.env.ADMIN_PASSWORD ?? "");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
