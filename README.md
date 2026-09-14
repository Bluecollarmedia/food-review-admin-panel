# food-review-admin-panel

Standalone admin panel for the D&S Food Reviews app. It shares the same Supabase
backend as the main site, so changes made here (settings, passcodes, etc.) apply
to the live site.

All eight admin tabs are fully wired to the same backends the main site uses.
Set these env vars in your deploy (e.g. Netlify) with the **same values** as the
main site so both apps talk to the same data. See `BACKEND_TODO.md` for the full
per-tab breakdown.

| Variable | What it's for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (shared with main site) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ADMIN_USERNAME` | Username for the admin login |
| `ADMIN_PASSWORD` | Password for the admin login (also signs the session) |
| `SETTINGS_PASSCODE` | Optional fallback security passcode (usually set in Settings instead) |
| `LOCKED_PASSCODE` | Optional fallback for the Locked video passcode |
| `VAULT_PASSCODE` | Optional fallback for the Vault video passcode |
| `BLOBS_SITE_ID` | The MAIN site's Netlify Site ID — shares Reviews/Visitors/Appeals/view-count data |
| `BLOBS_TOKEN` | A Netlify personal access token with Blobs access |
| `R2_ENDPOINT` | R2/S3 endpoint (video + photo storage) |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | Public read URL base for stored files |
| `RESEND_API_KEY` | Resend API key, for emails + the "Send test email" button |
| `RESEND_FROM_EMAIL` | From address for emails (e.g. `D&S <hi@yourdomain.com>`) |
| `GOOGLE_MAPS_API_KEY` | Optional — Google Places autocomplete (map works without it) |

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it forwards to `/admin`.
