# food-review-admin-panel

Standalone admin panel for the D&S Food Reviews app. It shares the same Supabase
backend as the main site, so changes made here (settings, passcodes, etc.) apply
to the live site.

## Environment variables

Set these in your deploy (e.g. Netlify) — use the same values as the main site so
both apps talk to the same data:

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
| `RESEND_API_KEY` | Resend API key, for the "Send test email" button |
| `RESEND_FROM_EMAIL` | From address for emails (e.g. `D&S <hi@yourdomain.com>`) |

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it forwards to `/admin`.
