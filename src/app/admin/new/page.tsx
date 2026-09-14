import Link from "next/link";
import ReviewForm from "@/components/admin/ReviewForm";
import { listAllReviews } from "@/lib/reviews-store";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  const reviews = await listAllReviews();
  const allReviews = reviews.map((r) => ({ slug: r.slug, title: r.title }));
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to admin
      </Link>
      <h1 className="mt-3 font-display text-3xl tracking-wide text-foreground">
        Add New Review
      </h1>
      <div className="mt-6">
        <ReviewForm mode="create" allReviews={allReviews} />
      </div>
    </div>
  );
}
