import Link from "next/link";
import { notFound } from "next/navigation";
import { getReview, listAllReviews } from "@/lib/reviews-store";
import { isSettingsUnlocked } from "@/lib/settings-guard";
import ReviewForm from "@/components/admin/ReviewForm";

export const dynamic = "force-dynamic";

// NOTE: reviews come from Netlify Blobs (deferred) — getReview returns null for
// now, so this page 404s until that connection is wired (see BACKEND_TODO.md).
// The per-review comments panel (AdminCommentsPanel) will be added back when the
// reviews backend is connected; the form itself is fully ported.
export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) notFound();

  const unlocked = await isSettingsUnlocked();
  const reviews = await listAllReviews();
  const allReviews = reviews.map((r) => ({ slug: r.slug, title: r.title }));

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        Edit Review
      </h1>
      <div className="mt-6">
        <ReviewForm mode="edit" initial={review} unlocked={unlocked} allReviews={allReviews} />
      </div>
    </div>
  );
}
