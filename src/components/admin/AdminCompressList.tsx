"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicFileUrl } from "@/lib/media-url";
import { compressVideo, type VideoQuality } from "@/lib/compress-video";
import { uploadFile } from "@/lib/upload-file";
import type { Review } from "@/lib/data";

const QUALITY_OPTIONS: VideoQuality[] = ["1080p", "720p", "480p", "360p"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

type Status = "idle" | "downloading" | "compressing" | "uploading" | "saving" | "done" | "error";

function VideoRow({
  label,
  review,
  videoKey,
  size,
  isSecond,
}: {
  label: string;
  review: Review;
  videoKey: string;
  size: number | undefined;
  isSecond: boolean;
}) {
  const router = useRouter();
  const [quality, setQuality] = useState<VideoQuality>("720p");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [newSize, setNewSize] = useState<number | null>(null);

  async function handleCompress() {
    setStatus("downloading");
    setError("");
    setProgress(null);
    try {
      const videoUrl = getPublicFileUrl(videoKey);
      if (!videoUrl) throw new Error("No video URL.");
      const res = await fetch(videoUrl);
      if (!res.ok) throw new Error("Could not download the current video.");
      const blob = await res.blob();
      const file = new File([blob], "existing-video.mp4", { type: blob.type || "video/mp4" });

      setStatus("compressing");
      const compressed = await compressVideo(file, setProgress, quality);

      setStatus("uploading");
      setProgress(0);
      const newKey = await uploadFile(compressed, "video.mp4", "videos", setProgress);

      setStatus("saving");
      const payload = {
        title: review.title,
        categories: review.categories,
        store: review.store,
        city: review.city,
        rating: review.rating,
        price: review.price,
        description: review.description,
        reviewer: review.reviewer,
        status: review.status,
        videoKey: isSecond ? review.videoKey : newKey,
        thumbnailKey: review.thumbnailKey,
        secondReviewer: review.secondReviewer,
        secondReviewerVideoKey: isSecond ? newKey : review.secondReviewerVideoKey,
        secondReviewerThumbnailKey: review.secondReviewerThumbnailKey,
        secondReviewerRating: review.secondReviewerRating,
      };
      const saveRes = await fetch(`/api/admin/reviews/${review.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error("Compressed, but failed to save the review.");

      setNewSize(compressed.size);
      setStatus("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const busy = status !== "idle" && status !== "done" && status !== "error";

  return (
    <div className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {label}
          {size !== undefined && (
            <span className="ml-2 font-normal text-foreground/50">{formatBytes(size)}</span>
          )}
        </p>
        {status === "done" && newSize !== null && (
          <span className="text-xs font-semibold text-emerald-600">
            Done — now {formatBytes(newSize)}
          </span>
        )}
      </div>

      {status === "idle" || status === "error" ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  quality === q
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground/70"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCompress}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background"
          >
            Compress to {quality}
          </button>
        </div>
      ) : status === "done" ? null : (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
            <span>
              {status === "downloading" && "Downloading current video..."}
              {status === "compressing" && `Compressing... ${progress ?? 0}%`}
              {status === "uploading" && `Uploading... ${progress ?? 0}%`}
              {status === "saving" && "Saving..."}
            </span>
          </div>
          {progress !== null && (
            <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-surface-muted">
              <div
                className="h-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {busy && <p className="text-xs text-foreground/50">This can take a while — don&apos;t close the tab.</p>}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}

export default function AdminCompressList({
  reviews,
  sizeByKey,
}: {
  reviews: Review[];
  sizeByKey: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.slug} className="rounded-2xl border border-border bg-surface p-4">
          <p className="font-display text-lg tracking-wide text-foreground">{review.title}</p>
          {review.videoKey && (
            <VideoRow
              label={review.secondReviewer ? `${review.reviewer}'s video` : "Video"}
              review={review}
              videoKey={review.videoKey}
              size={sizeByKey[review.videoKey]}
              isSecond={false}
            />
          )}
          {review.secondReviewerVideoKey && (
            <VideoRow
              label={`${review.secondReviewer}'s video`}
              review={review}
              videoKey={review.secondReviewerVideoKey}
              size={sizeByKey[review.secondReviewerVideoKey]}
              isSecond={true}
            />
          )}
        </div>
      ))}
    </div>
  );
}
