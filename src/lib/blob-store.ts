import { getStore } from "@netlify/blobs";

// This admin panel is a SEPARATE Netlify site from the main food-reviews site,
// but its data (reviews, visitors, appeals, view counts) lives in the MAIN
// site's Netlify Blobs. Netlify Blobs are per-site, so to read/write the main
// site's stores we point every data-store call at that site explicitly, using
// its Site ID + a Netlify API token (with Blobs access) supplied via env vars.
//
// Set these in the admin app's deploy to share the main site's data:
//   BLOBS_SITE_ID  — the MAIN site's Netlify Site ID (API ID)
//   BLOBS_TOKEN    — a Netlify personal access token with Blobs access
//
// If they're not set, we fall back to this site's own (empty) ambient store,
// so local dev / a standalone deploy still works — it just won't see the main
// site's data.
export function sharedStore(name: string) {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name, siteID, token });
  }
  return getStore(name);
}
