import { listFiles } from "@/lib/r2";
import { listAllReviews } from "@/lib/reviews-store";
import AdminCompressList from "@/components/admin/AdminCompressList";

export const dynamic = "force-dynamic";

export default async function AdminCompressPage() {
  const [reviews, videoFiles] = await Promise.all([listAllReviews(), listFiles("videos/")]);

  const sizeByKey = new Map<string, number>();
  for (const f of videoFiles) sizeByKey.set(f.key, f.size);

  const withVideo = reviews.filter((r) => r.videoKey || r.secondReviewerVideoKey);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl tracking-wide text-foreground">
        Compress Existing Videos
      </h1>
      <p className="mt-1 text-foreground/60">
        Shrink videos that were already uploaded full quality. Downloads the current file into
        your browser, compresses it there, then replaces it — the old file gets deleted
        automatically once the new one is saved.
      </p>

      {withVideo.length === 0 ? (
        <p className="mt-8 text-center text-foreground/60">No reviews with videos yet.</p>
      ) : (
        <div className="mt-6">
          <AdminCompressList reviews={withVideo} sizeByKey={Object.fromEntries(sizeByKey)} />
        </div>
      )}
    </div>
  );
}
