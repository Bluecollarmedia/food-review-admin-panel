export type SendEmailResult = { ok: boolean; skipped?: boolean; error?: string };

// Build a From header that Resend always accepts, no matter how RESEND_FROM_EMAIL
// is written. We pull the first email address out of the env value (so it works
// whether they set a bare `x@y.com`, `Name <x@y.com>`, or something with stray
// quotes) and rebuild it with a quoted display name — quoting keeps special
// characters like the "&" in "D&S" from ever breaking the parser.
function fromAddress(): string {
  const raw = (process.env.RESEND_FROM_EMAIL || "").trim();
  const email = raw.match(/[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+/)?.[0];
  if (!email) return `"D&S Food Reviews" <onboarding@resend.dev>`;
  return `"D&S Food Reviews" <${email}>`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY is not set on the server." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      let detail = `Resend returned ${res.status}.`;
      try {
        const body = await res.json();
        if (body?.message) detail = body.message;
      } catch {
        // keep the status-based message
      }
      return { ok: false, error: detail };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error contacting Resend." };
  }
}
