import { createAdminClient } from "./supabase/admin";
import { sendEmail } from "./email";
import { reviewEmail, noticeEmail } from "./email-template";
import { getReview } from "./reviews-store";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyByEmail({
  origin,
  slug,
  parentId,
  message,
  authorId,
}: {
  origin: string;
  slug: string;
  parentId: string | null;
  message: string;
  authorId: string | null;
}) {
  const supabase = createAdminClient();
  const preview = message.slice(0, 240);
  const videoUrl = `${origin}/videos/${slug}`;

  // Which review this is on, for context in the email.
  const review = await getReview(slug).catch(() => null);
  const videoTitle = review?.title;

  // The parent comment (both its author and its text) when this is a reply.
  let parent: { user_id: string | null; message: string } | null = null;
  if (parentId) {
    const { data } = await supabase
      .from("comments")
      .select("user_id, message")
      .eq("id", parentId)
      .single();
    parent = data ?? null;
  }
  const parentText = parent?.message ? parent.message.slice(0, 200) : undefined;

  const { data: adminSettings } = await supabase
    .from("admin_settings")
    .select("email_notifications, notify_email")
    .eq("id", 1)
    .single();

  if (adminSettings?.email_notifications && adminSettings.notify_email) {
    await sendEmail({
      to: adminSettings.notify_email,
      subject: parentId ? "New reply on D&S Food Reviews" : "New comment on D&S Food Reviews",
      html: noticeEmail({
        heading: parentId ? "New reply on your site" : "New comment on your site",
        onTitle: videoTitle,
        replyingTo: parentId ? parentText : undefined,
        message: preview,
        ctaUrl: videoUrl,
        ctaLabel: "View it",
      }),
    });
  }

  if (!parentId) return;

  const parentUserId = parent?.user_id;
  if (!parentUserId || parentUserId === authorId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_notifications")
    .eq("id", parentUserId)
    .single();

  if (!profile?.email_notifications) return;

  const { data: userResult } = await supabase.auth.admin.getUserById(parentUserId);
  const email = userResult?.user?.email;
  if (!email) return;

  await sendEmail({
    to: email,
    subject: "Someone replied to your comment",
    html: noticeEmail({
      heading: "Someone replied to your comment",
      onTitle: videoTitle,
      replyingTo: parentText,
      message: preview,
      ctaUrl: videoUrl,
      ctaLabel: "View the reply",
    }),
  });
}

export async function notifyNewAccount({ name, email }: { name: string; email: string }) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("notify_email")
    .eq("id", 1)
    .single();
  const to = data?.notify_email;
  if (!to) return;

  await sendEmail({
    to,
    subject: `New account request: ${name || email || "someone"}`,
    html: noticeEmail({
      heading: "New account awaiting approval",
      extraHtml: `<p style="margin:0 0 14px;color:#6b625a;font-size:15px;"><strong style="color:#221d19;">${escapeHtml(name || "—")}</strong><br/>${escapeHtml(email || "—")}</p>`,
      message: "Review their profile picture and verification selfie, then Approve or Deny them in the admin panel → Accounts.",
    }),
  });
}

export async function notifyNewUpload({
  origin,
  slug,
  title,
  store,
  city,
  rating,
  thumbnailUrl,
}: {
  origin: string;
  slug: string;
  title: string;
  store?: string;
  city?: string;
  rating?: number | null;
  thumbnailUrl?: string | null;
}) {
  const supabase = createAdminClient();
  const videoUrl = `${origin}/videos/${slug}`;
  const details = { title, store, city, rating, thumbnailUrl, videoUrl };

  // Always send the owner a confirmation that a review went live.
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("notify_email")
    .eq("id", 1)
    .single();
  if (settings?.notify_email) {
    await sendEmail({
      to: settings.notify_email,
      subject: `Published: ${title}`,
      html: reviewEmail({ ...details, forOwner: true }),
    });
  }

  // Notify only members who opted into new-video alerts (off by default).
  const { data: subscribers } = await supabase
    .from("profiles")
    .select("id")
    .eq("new_upload_notifications", true);

  if (!subscribers || subscribers.length === 0) return;

  const memberHtml = reviewEmail({ ...details, forOwner: false });
  await Promise.all(
    subscribers.map(async ({ id }) => {
      const { data: userResult } = await supabase.auth.admin.getUserById(id);
      const email = userResult?.user?.email;
      if (!email) return;

      await sendEmail({
        to: email,
        subject: `New review: ${title}`,
        html: memberHtml,
      });
    })
  );
}
