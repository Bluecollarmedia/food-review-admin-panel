// FRONT-END PLACEHOLDER. The real R2 (S3) implementation — listing and deleting
// bucket files via @aws-sdk/client-s3 — is deferred until we wire up storage.
// See BACKEND_TODO.md. For now this only exports the shape the Storage UI needs.
//
// SAFETY: do NOT enable the Storage "orphaned files" scan/delete until the
// reviews data (Netlify Blobs) is also connected. Orphan detection subtracts
// in-use review video/thumbnail keys; without reviews connected it would flag
// real, in-use files as orphaned and offer to delete them irreversibly.

export type BucketFile = {
  key: string;
  size: number;
  lastModified: string;
};

/** Not implemented yet — returns nothing until R2 is connected. */
export async function listFiles(_prefix: string): Promise<BucketFile[]> {
  return [];
}
