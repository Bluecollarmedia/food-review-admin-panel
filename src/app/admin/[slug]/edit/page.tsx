import Link from "next/link";
import { notFound } from "next/navigation";
import { getReview, listAllReviews } from "@/lib/reviews-store";
import { isSettingsUnlocked } from "@/lib/settings-guard";
import ReviewForm from "@/components/admin/ReviewForm";
import AdminCommentsPanel from "@/components/admin/AdminCommentsPanel";

export const dynamic = "force-dynamic";

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
      <AdminCommentsPanel slug={review.slug} />
    </div>
  );
}
