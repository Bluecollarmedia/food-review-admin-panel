import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SETTINGS_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/session";

// Small in-memory cache so the security passcode isn't a database read on every
// single request. Changing it takes effect within this window.
const LOCK_TTL_MS = 10_000;

// The separate "security passcode": with just the shared admin code you can
// only manage reviews and upload. Everything else in the admin panel needs
// this. Cached, and read on its own so a failure can't disturb anything else.
let secCache: { value: string; at: number } | null = null;

async function getSecurityPasscode(): Promise<string> {
  if (secCache && Date.now() - secCache.at < LOCK_TTL_MS) return secCache.value;
  const fallback = process.env.SETTINGS_PASSCODE ?? "";
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?id=eq.1&select=settings_passcode`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        },
      }
    );
    if (!res.ok) return fallback;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const value = row?.settings_passcode || fallback;
    secCache = { value, at: Date.now() };
    return value;
  } catch {
    return fallback;
  }
}

// Areas a co-admin (shared admin code only) is allowed into: reviews + upload,
// plus the pages/endpoints needed to unlock the rest. Everything else under
// /admin is gated behind the security passcode. Whitelist, so anything new is
// protected by default.
function isBasicAdminPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/new" || pathname === "/admin/unlock") {
    return true;
  }
  if (/^\/admin\/[^/]+\/edit$/.test(pathname)) return true;
  if (pathname === "/api/admin/reviews" || pathname.startsWith("/api/admin/reviews/")) {
    return true;
  }
  if (pathname === "/api/admin/upload-url") return true;
  if (pathname === "/api/admin/views") return true;
  if (pathname === "/api/admin/resolve-location") return true;
  if (pathname === "/api/admin/settings/unlock") return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The root just forwards into the panel.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Only the admin area and its API are served by this app — everything is
  // behind the admin login. The login page/endpoint itself must stay open.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // The web UI authenticates with an httpOnly cookie; the native app can't use
    // cookies, so it sends the same token as an x-admin-token header instead.
    const token =
      req.cookies.get(ADMIN_SESSION_COOKIE)?.value ??
      req.headers.get("x-admin-token") ??
      undefined;
    const valid = await verifySessionToken(token, process.env.ADMIN_PASSWORD ?? "");
    if (!valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Logged in with the shared admin code. Everything beyond reviews/upload
    // needs the separate security passcode on top.
    if (!isBasicAdminPath(pathname)) {
      const securityPass = await getSecurityPasscode();
      if (securityPass) {
        const settingsToken =
          req.cookies.get(SETTINGS_SESSION_COOKIE)?.value ??
          req.headers.get("x-settings-token") ??
          undefined;
        if (!(await verifySessionToken(settingsToken, securityPass))) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "This area needs the security passcode." },
              { status: 403 }
            );
          }
          const unlockUrl = new URL("/admin/unlock", req.url);
          unlockUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(unlockUrl);
        }
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and public static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|icons/|images/).*)",
  ],
};
