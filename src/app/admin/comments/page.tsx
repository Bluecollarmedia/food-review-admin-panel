import Link from "next/link";
import AdminAllComments from "@/components/admin/AdminAllComments";

export const dynamic = "force-dynamic";

export default async function AdminAllCommentsPage() {
  // The comments themselves come live from Supabase (shared). The slug -> title
  // map used to label each comment with its video comes from reviews-store,
  // which lives in the main site's Netlify Blobs — not connected yet (see
  // BACKEND_TODO.md). Until then, each comment falls back to showing the slug.
  const reviewTitles: Record<string, string> = {};

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        All Comments
      </h1>
      <p className="mt-1 text-foreground/60">
        Every comment and reply across every video, most recent first.
      </p>

      <AdminAllComments reviewTitles={reviewTitles} />
    </div>
  );
}
