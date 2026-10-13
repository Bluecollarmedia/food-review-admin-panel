export function getPublicFileUrl(key?: string | null) {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/**
 * Thumbnails also get a small (640px) copy in R2 at `thumbnails-small/<key>`,
 * so grids and lists don't download full-size images. Only keys under
 * `thumbnails/` have one.
 */
export function smallThumbnailKey(key: string) {
  return `thumbnails-small/${key}`;
}

/** Turns a full thumbnail URL into its small copy's URL, or null if it has none. */
export function smallThumbnailUrl(url: string) {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base || !url.startsWith(`${base}/thumbnails/`)) return null;
  return `${base}/${smallThumbnailKey(url.slice(base.length + 1))}`;
}
