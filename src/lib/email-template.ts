// Shared, email-client-safe HTML (tables + inline styles) so every email from
// the site looks consistent and branded.

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const RED = "#c8102e";
const CARD = "#fffaf3";
const PAGE = "#efe6d8";
const INK = "#221d19";
const MUTED = "#8a7f72";
const BORDER = "#ece0cd";

/** Wrap inner content in the branded shell (warm, rounded card). */
export function emailShell(innerHtml: string): string {
  return `
  <div style="margin:0;padding:28px 14px;background:${PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:${CARD};border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,20,0.12);">
      <tr>
        <td style="padding:26px 28px 6px;text-align:center;">
          <span style="color:${RED};font-size:16px;font-weight:800;letter-spacing:1.5px;">D&amp;S FOOD REVIEWS</span>
        </td>
      </tr>
      ${innerHtml}
      <tr>
        <td style="padding:18px;border-top:1px solid ${BORDER};text-align:center;">
          <p style="margin:0;color:#a89a88;font-size:12px;">Honest, brutal, non-biased reviews on food.</p>
        </td>
      </tr>
    </table>
  </div>`;
}

/** A general branded notice (comment, reply, new account, etc.). */
export function noticeEmail(opts: {
  heading: string;
  onTitle?: string; // e.g. the review the comment is on
  replyingTo?: string; // the parent comment a reply is answering
  message?: string; // shown as a quote block
  extraHtml?: string; // extra lines above the quote
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const onLine = opts.onTitle
    ? `<p style="margin:0 0 16px;color:${MUTED};font-size:13px;">On <strong style="color:${INK};">${escapeHtml(opts.onTitle)}</strong></p>`
    : "";
  const replyingTo = opts.replyingTo
    ? `<p style="margin:0 0 5px;color:${MUTED};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">In reply to</p>
       <div style="background:#f0e8da;border-radius:8px;padding:10px 13px;color:${MUTED};font-size:14px;line-height:1.4;font-style:italic;margin-bottom:14px;">${escapeHtml(opts.replyingTo)}</div>`
    : "";
  const quote = opts.message
    ? `<div style="background:#f6efe4;border-left:3px solid ${RED};border-radius:8px;padding:12px 14px;color:${INK};font-size:15px;line-height:1.45;">${escapeHtml(opts.message)}</div>`
    : "";
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<div style="margin-top:22px;"><a href="${opts.ctaUrl}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 34px;border-radius:999px;">${escapeHtml(opts.ctaLabel)}</a></div>`
      : "";
  return emailShell(`
    <tr><td style="padding:22px 28px 28px;">
      <h1 style="margin:0 0 10px;color:${INK};font-size:20px;font-weight:800;line-height:1.25;">${escapeHtml(opts.heading)}</h1>
      ${onLine}
      ${opts.extraHtml ?? ""}
      ${replyingTo}
      ${quote}
      ${cta}
    </td></tr>
  `);
}

/** "New review published" email with the thumbnail. */
export function reviewEmail(opts: {
  title: string;
  store?: string;
  city?: string;
  rating?: number | null;
  thumbnailUrl?: string | null;
  videoUrl: string;
  forOwner: boolean;
}): string {
  const { title, store, city, rating, thumbnailUrl, videoUrl } = opts;
  const place = [store, city].filter(Boolean).map((s) => escapeHtml(String(s))).join(" · ");

  const thumb = thumbnailUrl
    ? `<tr><td style="padding:14px 20px 0;"><a href="${videoUrl}"><img src="${thumbnailUrl}" alt="${escapeHtml(title)}" width="480" style="display:block;width:100%;border-radius:18px;" /></a></td></tr>`
    : "";

  const ratingBadge =
    typeof rating === "number"
      ? `<span style="display:inline-block;background:#fdecef;color:${RED};font-size:14px;font-weight:800;padding:5px 14px;border-radius:999px;">★ ${escapeHtml(String(rating))}</span>`
      : "";

  return emailShell(`
    ${thumb}
    <tr><td style="padding:20px 28px 28px;text-align:center;">
      ${ratingBadge}
      <h1 style="margin:14px 0 4px;color:${INK};font-size:24px;font-weight:800;line-height:1.2;">${escapeHtml(title)}</h1>
      ${place ? `<p style="margin:0 0 22px;color:${MUTED};font-size:15px;">${place}</p>` : `<div style="height:10px;"></div>`}
      <a href="${videoUrl}" style="display:inline-block;background:${RED};color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:999px;">Watch it &rarr;</a>
    </td></tr>
  `);
}
