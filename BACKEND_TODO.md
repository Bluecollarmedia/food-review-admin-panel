# Backends: all connected ✅ — deploy checklist

Every admin tab is now wired to the real data. Nothing is stubbed. What's left
is **setting environment variables** in the admin app's deploy (Netlify) so it
talks to the SAME backends as the main food-reviews site. Use the same values
the main site uses.

## Environment variables to set

### Supabase (shared database — Settings, Accounts, Comments, Notifications, bans)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Admin login (the panel's own gate)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SETTINGS_PASSCODE` — optional fallback security passcode (usually set in Settings instead)

### Shared Netlify Blobs (Reviews, Visitors, Appeals, view counts)
The admin app is a separate Netlify site, so to read the MAIN site's blob data it
points at that site explicitly:
- `BLOBS_SITE_ID` — the MAIN food-reviews site's Netlify Site ID (API ID)
- `BLOBS_TOKEN` — a Netlify personal access token with Blobs access
If these are unset, blob-backed tabs fall back to this site's own (empty) store.

### R2 / S3 storage (video + photo uploads, Storage tab, appeal selfies)
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` — public read URL base (thumbnails, avatars, selfies)

### Email (Resend — "Send test email", new-review + new-account notifications)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Location search (optional — the map works without it)
- `GOOGLE_MAPS_API_KEY` — enables Google Places autocomplete. Without it, the
  picker falls back to free Photon/Nominatim search; map click/drag/paste always work.

## Per-tab data source (reference)
| Tab | Data |
| --- | --- |
| Settings | Supabase `admin_settings` |
| Reviews | Netlify Blobs `reviews` + R2 files + Blobs `views`/`view-overrides` |
| Visitors | Netlify Blobs `visitors` + Supabase bans (`admin_settings`) |
| Appeals | Netlify Blobs `appeals` + R2 selfies + Supabase unban |
| Accounts | Supabase auth + `profiles` + R2 avatars/selfies |
| Comments | Supabase `comments` (+ review titles from Blobs) |
| Notifications | Supabase `admin_notifications` (+ review titles from Blobs) |
| Storage | R2 bucket listing minus in-use keys (Blobs reviews + Supabase) |

## Safety notes
- The Storage delete endpoint re-checks server-side that a file is truly unused
  (not referenced by any review, avatar, or comment) before deleting — so it can
  never remove an in-use file even if the list was stale.
- The admin app never seeds demo reviews into the shared blob store.
- Locked/Vault reviews can't be published or deleted without the security passcode.
