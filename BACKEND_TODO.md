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
- **Notifications** — loads live from the Supabase `admin_notifications` table
  and marks unread ones read on view. Same partial as Comments: the video-title
  label uses the slug until reviews/blobs are connected.

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

### Reviews (list + create/edit form)
- Front-end fully ported: the reviews **list** (`/admin`), the **New Review**
  form (`/admin/new`) and **Edit** form (`/admin/[slug]/edit`), the **map
  location picker** (Leaflet + OSM tiles work client-side), the **16:9 thumbnail
  crop editor**, and **in-browser video compression** (ffmpeg.wasm; static
  assets copied to `public/ffmpeg/`). The view-count editor UI on each card is
  ported too.
- NOT connected — these all need backends wired:
  - **Reviews data** lives in Netlify Blobs (`getStore("reviews")`), per-site.
    `src/lib/reviews-store.ts` is a stub: `listAllReviews()` → [] and
    `getReview()` → null, so the list shows the empty state and the edit page
    404s until connected. Wire it (shared Netlify Blobs) + restore the real
    create/update/delete and the `/api/admin/reviews` + `/api/admin/reviews/[slug]`
    routes.
  - **Uploads** go through `/api/admin/upload-url` (R2 presigned PUT) — deferred
    (needs R2 creds + the route).
  - **View counts / overrides** are Netlify Blobs (`views`, `view-overrides`).
    `src/lib/views.ts` and `src/lib/view-counts.ts` are stubs returning empty;
    the card's "Edit views" posts to a deferred `/api/admin/views`.
  - **Location search** (`LocationPicker`) posts to `/api/admin/resolve-location`
    (Google Places + Photon) — deferred. Map click/drag/paste-coords work now;
    typed autocomplete + link resolving need that route + a Google key.
  - The **duration backfill** tool posts to a deferred `/api/reviews/[slug]/duration`.
  - The Edit page's per-review **comments panel** (AdminCommentsPanel) was left
    out for now; add it back with `use-comments` when reviews connect.

### Storage
- Front-end built (header, "Compress videos" link, orphaned-files list
  component, empty state). NOT connected.
- Needs: **R2 (S3) bucket access** via `@aws-sdk/client-s3` + R2 credentials
  (`listFiles` / delete), plus **reviews data (Netlify Blobs)** to know which
  video/thumbnail keys are in use. Avatars + comment images already come from
  Supabase (shared).
- ⚠️ SAFETY: do NOT enable the orphaned-files scan/delete until reviews (blobs)
  are connected. Orphan detection = all bucket files MINUS in-use keys; if
  reviews aren't connected, every real review video/thumbnail looks "orphaned"
  and the Delete button would irreversibly remove in-use files. `src/lib/r2.ts`
  is currently a type-only placeholder (`listFiles` returns []).
- The `/admin/compress` tool is a placeholder page for now.

## Notes
- Anything backed by **Supabase** (Settings, Comments, Accounts, Notifications,
  Reviews data) shares with the main site automatically once the Supabase env
  vars are set — no per-site blob token needed.
- Anything backed by **Netlify Blobs** (Visitors, Appeals, rate-limits) is
  per-site and needs the shared-blob env vars to see the main site's data.
- Video/image **files** live in external storage (S3 / R2) — shared via bucket
  credentials in env vars.
