import Link from "next/link";
import { listAllReviews } from "@/lib/reviews-store";
import { getAllViews } from "@/lib/views";
import { getAllViewSettings } from "@/lib/view-counts";
import { isSettingsUnlocked } from "@/lib/settings-guard";
import { getPublicFileUrl } from "@/lib/media-url";
import AdminReviewCard from "@/components/admin/AdminReviewCard";
import BackfillDurations from "@/components/admin/BackfillDurations";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reviews = await listAllReviews();
  const slugs = reviews.map((r) => r.slug);
  const views = await getAllViews(slugs);
  const settings = await getAllViewSettings(slugs);
  const unlocked = await isSettingsUnlocked();

  // Videos that don't have a stored length yet — the backfill tool measures them.
  const missingDurations = reviews
    .filter((r) => r.videoKey && typeof r.durationSeconds !== "number")
    .map((r) => ({ slug: r.slug, videoUrl: getPublicFileUrl(r.videoKey) }))
    .filter((x): x is { slug: string; videoUrl: string } => !!x.videoUrl);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl tracking-wide text-foreground">
          Admin &middot; Reviews
        </h1>
        <Link
          href="/admin/new"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          + Add New Review
        </Link>
      </div>

      <div className="mt-8">
        <BackfillDurations items={missingDurations} />
      </div>

      <div className="mt-2 flex flex-col gap-4">
        {reviews.map((r) => (
          <AdminReviewCard
            key={r.slug}
            review={r}
            views={views[r.slug] ?? 0}
            publicViews={r.displayViews ?? 0}
            viewSetting={settings[r.slug] ?? null}
            unlocked={unlocked}
          />
        ))}

        {reviews.length === 0 && (
          <p className="mt-8 text-center text-foreground/60">
            No reviews yet — tap &quot;Add New Review&quot; to create the first one.
          </p>
        )}
      </div>
    </div>
  );
}
