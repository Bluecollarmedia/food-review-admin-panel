import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only (gated by the middleware). Sends a real test email and returns the
// actual Resend result — including the error text — so email setup problems are
// visible instead of failing silently.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  let to = typeof body?.to === "string" ? body.to.trim() : "";

  if (!to) {
    const supabase = createAdminClient();
    const { data } = await supabase.from("admin_settings").select("notify_email").eq("id", 1).single();
    to = data?.notify_email ?? "";
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid notification email first (and save)." },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to,
    subject: "Test email from D&S Food Reviews",
    html: "<p>✅ Your email setup is working. This is a test sent from the admin panel.</p>",
  });

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev (fallback — set RESEND_FROM_EMAIL)";
  return NextResponse.json({ ...result, to, from });
}
