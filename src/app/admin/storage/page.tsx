import Link from "next/link";
import type { BucketFile } from "@/lib/r2";
import AdminStorageList from "@/components/admin/AdminStorageList";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// FRONT-END ONLY for now. The live version scans the R2 bucket and subtracts
// in-use keys from reviews (Netlify Blobs), avatars (Supabase) and comment
// images (Supabase) to find orphaned files. R2 and reviews aren't connected
// yet — see BACKEND_TODO.md — and orphan detection MUST NOT run until reviews
// are connected, or it would flag real in-use files for deletion. Until then
// this renders the shell + empty state.
export default async function AdminStoragePage() {
  const allFiles: BucketFile[] = [];
  const orphaned: BucketFile[] = [];
  const orphanedBytes = 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl tracking-wide text-foreground">Storage</h1>
        <Link
          href="/admin/compress"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:border-primary hover:text-primary"
        >
          Compress videos &rarr;
        </Link>
      </div>
      <p className="mt-1 text-foreground/60">
        {allFiles.length} files in the bucket (videos, thumbnails, avatars, comment photos)
        &middot; {orphaned.length} not linked to anything, using {formatBytes(orphanedBytes)}.
      </p>

      {orphaned.length === 0 ? (
        <p className="mt-8 text-center text-foreground/60">
          Nothing unused — every file in the bucket is linked to something.
        </p>
      ) : (
        <div className="mt-6">
          <AdminStorageList files={orphaned} />
        </div>
      )}
    </div>
  );
}
