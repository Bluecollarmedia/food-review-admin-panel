// Sends push notifications via Expo's push service, which relays to APNs
// (iOS) / FCM (Android) on our behalf — this is what the mobile app's
// getExpoPushTokenAsync() token is for. Nothing on the website called this
// API before; profiles.push_token was only ever being collected, never used.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's push API's own per-request cap.

export type PushResult = {
  sent: number;
  failed: number;
  errors: string[];
};

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<PushResult> {
  const validTokens = tokens.filter((t) => t.startsWith("ExponentPushToken"));

  let sent = 0;
  let failed = tokens.length - validTokens.length;
  const errors: string[] = [];

  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(
          batch.map((to) => ({ to, title, body, sound: "default", data }))
        ),
      });
      const json = await res.json().catch(() => null);
      const tickets: Array<{ status: string; message?: string }> = json?.data ?? [];

      if (tickets.length === 0 && !res.ok) {
        failed += batch.length;
        errors.push(`Batch request failed: HTTP ${res.status}`);
        continue;
      }

      for (const ticket of tickets) {
        if (ticket.status === "ok") sent++;
        else {
          failed++;
          if (ticket.message) errors.push(ticket.message);
        }
      }
    } catch (err) {
      failed += batch.length;
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return { sent, failed, errors };
}
