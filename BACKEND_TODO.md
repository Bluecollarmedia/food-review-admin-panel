# Backend connections still to wire up

We're building the admin panel **front-ends first** and connecting the real data
sources later. This file tracks every backend connection that still needs to be
hooked up, so nothing is forgotten.

## ✅ Fully connected (shares live data with the main site)
- **Settings** — reads/writes Supabase `admin_settings`. Done, works against the
  same live data as the main site.
- **Accounts** — reads Supabase auth users + `profiles`; Suspend/Approve (PATCH
  `approval_status`) and Delete (auth admin deleteUser) both work live. Avatar /
  selfie images come from `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` (set it to the same
  value as the main site so photos show; otherwise it falls back to initials).
- **Comments** — loads live from the Supabase `comments` table (paginated) and
  Delete (soft-delete via `/api/admin/comments/[slug]/[commentId]`) works live.
  One partial: the **video title** shown under each comment comes from
  `reviews-store` (Netlify Blobs, not connected yet), so for now each comment
  shows the video **slug** instead of the nice title. Wire it up when the
  reviews/blobs connection is added (pass a real slug->title map into the page).

## ⏳ Front-end built, backend NOT connected yet

### Visitors
- Visitor records (device list, names/labels, visit history, IPs/locations) live
  in **Netlify Blobs** (`getStore("visitors")`), scoped to the main Netlify site.
- Ban list + ban message are in Supabase `admin_settings` (already shareable).
- **To connect:** point the admin app's blob calls at the main site's store via
  `NETLIFY_BLOBS_SITE_ID` + a Netlify Blobs token, set at deploy.
- Status: still a placeholder page (front-end not built yet — skipped for now).

### Appeals
- Appeal records live in **Netlify Blobs** (`getStore("appeals")`), scoped to the
  main Netlify site. Selfie photos live in **R2** (via `selfieKey`).
- Unban/ban actions use Supabase `admin_settings` (shareable).
- **To connect:** shared Netlify Blobs (same as Visitors) + R2 read access for
  selfie URLs, plus the `/api/admin/appeal*` routes.

## Notes
- Anything backed by **Supabase** (Settings, Comments, Accounts, Notifications,
  Reviews data) shares with the main site automatically once the Supabase env
  vars are set — no per-site blob token needed.
- Anything backed by **Netlify Blobs** (Visitors, Appeals, rate-limits) is
  per-site and needs the shared-blob env vars to see the main site's data.
- Video/image **files** live in external storage (S3 / R2) — shared via bucket
  credentials in env vars.
