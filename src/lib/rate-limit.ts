import { getStore } from "@netlify/blobs";
import type { NextRequest } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type Record = { count: number; firstAttemptAt: number };

type Limits = { maxAttempts?: number; windowMs?: number };

function rateLimitStore() {
  // Attempts are read-then-written on every request in quick succession, so
  // the default eventual consistency can miss the previous write and let
  // the count appear to never climb — force strong consistency instead.
  return getStore("rate-limits", { consistency: "strong" });
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function checkRateLimit(
  key: string,
  limits: Limits = {}
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const maxAttempts = limits.maxAttempts ?? MAX_ATTEMPTS;
  const windowMs = limits.windowMs ?? WINDOW_MS;
  try {
    const store = rateLimitStore();
    const record = (await store.get(key, { type: "json" })) as Record | null;
    const now = Date.now();

    if (record && now - record.firstAttemptAt < windowMs && record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.firstAttemptAt + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true };
  } catch (err) {
    console.error("[rate-limit] checkRateLimit FAILED, allowing request through", err);
    return { allowed: true };
  }
}

export async function recordFailedAttempt(key: string, limits: Limits = {}): Promise<void> {
  const windowMs = limits.windowMs ?? WINDOW_MS;
  try {
    const store = rateLimitStore();
    const now = Date.now();
    const record = (await store.get(key, { type: "json" })) as Record | null;

    const next =
      record && now - record.firstAttemptAt < windowMs
        ? { count: record.count + 1, firstAttemptAt: record.firstAttemptAt }
        : { count: 1, firstAttemptAt: now };

    await store.setJSON(key, next);
  } catch (err) {
    console.error("[rate-limit] recordFailedAttempt FAILED to persist", err);
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  await rateLimitStore().delete(key);
}
