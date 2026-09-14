"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { categories, cities, reviewers, prices, type Review } from "@/lib/data";
import ImageCropper from "../ImageCropper";
import LocationPicker from "./LocationPicker";
import { compressVideo, type VideoQuality } from "@/lib/compress-video";
import { uploadFile } from "@/lib/upload-file";

const QUALITY_OPTIONS: { value: "full" | VideoQuality; label: string }[] = [
  { value: "full", label: "Full quality" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
  { value: "360p", label: "360p" },
];

type Props = {
  mode: "create" | "edit";
  initial?: Review;
  unlocked?: boolean;
  allReviews?: { slug: string; title: string }[];
};

function UploadDropzone({
  accept,
  icon,
  title,
  subtitle,
  onPicked,
}: {
  accept: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPicked: (file: File | undefined) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-foreground/50">{subtitle}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onPicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

const uploadIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
    <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function MediaUploadFields({
  label,
  thumbnailKey,
  thumbnailPreviewUrl,
  thumbnailProgress,
  onThumbnailPicked,
  videoKey,
  videoFile,
  videoProgress,
  videoPhase,
  onVideoPicked,
  videoQuality,
  onVideoQualityChange,
}: {
  label?: string;
  thumbnailKey?: string;
  thumbnailPreviewUrl: string | null;
  thumbnailProgress: number | null;
  onThumbnailPicked: (file: File | undefined) => void;
  videoKey?: string;
  videoFile: File | null;
  videoProgress: number | null;
  videoPhase?: "compressing" | "uploading";
  onVideoPicked: (file: File | undefined) => void;
  videoQuality: "full" | VideoQuality;
  onVideoQualityChange: (quality: "full" | VideoQuality) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-base font-bold text-foreground">
          {label ? `Upload ${label}'s video` : "Upload the video"}
        </p>
        <UploadDropzone
          accept="video/*"
          icon={uploadIcon}
          title={
            videoKey || videoFile
              ? `Tap here to replace ${label ? `${label}'s` : "the"} video`
              : `Tap here to upload ${label ? `${label}'s` : "the"} video`
          }
          subtitle={
            videoFile
              ? `Selected: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)`
              : videoKey
              ? "A video is already uploaded ✓"
              : "The review video file from your phone or computer"
          }
          onPicked={onVideoPicked}
        />

        <div className="mt-3">
          <p className="mb-1 text-sm font-semibold text-foreground">Video quality</p>
          <div className="flex flex-wrap gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onVideoQualityChange(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  videoQuality === opt.value
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-foreground/50">
            {videoQuality === "full"
              ? "Uploads the file as-is, no compression."
              : `Compresses down to ${videoQuality} before uploading, right in your browser (the first time, it downloads a one-time ~30MB tool to do this).`}
          </p>
        </div>

        {videoProgress !== null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{videoPhase === "compressing" ? "Compressing..." : "Uploading..."}</span>
              <span>{videoProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-surface-muted">
              <div
                className="h-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-base font-bold text-foreground">
          {label ? `Upload ${label}'s thumbnail` : "Upload a thumbnail"}
        </p>
        {thumbnailPreviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailPreviewUrl}
            alt="Thumbnail preview"
            className="mb-2 aspect-video w-full rounded-lg border border-border object-cover"
          />
        )}
        <UploadDropzone
          accept="image/*"
          icon={uploadIcon}
          title={
            thumbnailKey || thumbnailPreviewUrl
              ? `Tap here to replace ${label ? `${label}'s` : "the"} thumbnail`
              : `Tap here to upload ${label ? `${label}'s` : "a"} thumbnail image`
          }
          subtitle={
            thumbnailKey && !thumbnailPreviewUrl
              ? "A thumbnail is already uploaded ✓"
              : "JPG or PNG photo of the food"
          }
          onPicked={onThumbnailPicked}
        />
        {thumbnailProgress !== null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-foreground">
              <span>Uploading...</span>
              <span>{thumbnailProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border border-border bg-surface-muted">
              <div
                className="h-full bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${thumbnailProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewForm({ mode, initial, unlocked = true, allReviews = [] }: Props) {
  const router = useRouter();

  // A Locked/Vault video's visibility is frozen unless the security passcode has
  // been entered this session. This stops a co-admin with just the shared admin
  // login from moving protected content out to Published and watching it.
  const isProtected = initial?.status === "locked" || initial?.status === "vault";
  const visibilityLocked = mode === "edit" && isProtected && !unlocked;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [store, setStore] = useState(initial?.store ?? "");
  const [city, setCity] = useState(initial?.city ?? cities[0]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initial?.categories ?? []
  );
  const [rating, setRating] = useState(initial?.rating?.toString() ?? "8");
  const [price, setPrice] = useState<string>(initial?.price ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [originalReviewSlug, setOriginalReviewSlug] = useState(initial?.originalReviewSlug ?? "");
  const [showLinkPicker, setShowLinkPicker] = useState(!!initial?.originalReviewSlug);
  const [reviewer, setReviewer] = useState(initial?.reviewer ?? reviewers[0]);
  const [isGuestReviewer, setIsGuestReviewer] = useState(
    initial ? !reviewers.includes(initial.reviewer) : false
  );
  const [guestName, setGuestName] = useState(
    initial && !reviewers.includes(initial.reviewer) ? initial.reviewer : ""
  );
  const [status, setStatus] = useState<"published" | "draft" | "locked" | "vault">(
    initial?.status ?? "draft"
  );
  const [videoKey, setVideoKey] = useState<string | undefined>(initial?.videoKey);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [videoPhase, setVideoPhase] = useState<"compressing" | "uploading">("uploading");
  const [videoQuality, setVideoQuality] = useState<"full" | VideoQuality>("full");
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>(
    initial?.durationSeconds
  );

  // Read the selected video's length in the browser (no upload needed) so the
  // card can show a duration badge. Falls back to the existing value on edits.
  useEffect(() => {
    if (!videoFile) return;
    const url = URL.createObjectURL(videoFile);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setDurationSeconds(Math.round(probe.duration));
      }
      URL.revokeObjectURL(url);
    };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const [location, setLocation] = useState<{ lat?: number; lng?: number; address?: string }>({
    lat: initial?.lat,
    lng: initial?.lng,
    address: initial?.mapAddress,
  });

  const [thumbnailKey, setThumbnailKey] = useState<string | undefined>(
    initial?.thumbnailKey
  );
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailProgress, setThumbnailProgress] = useState<number | null>(null);

  const [hasSecondReviewer, setHasSecondReviewer] = useState(!!initial?.secondReviewer);
  const [secondReviewer, setSecondReviewer] = useState(initial?.secondReviewer ?? "");
  const [isSecondGuestReviewer, setIsSecondGuestReviewer] = useState(
    initial?.secondReviewer ? !reviewers.includes(initial.secondReviewer) : false
  );
  const [secondGuestName, setSecondGuestName] = useState(
    initial?.secondReviewer && !reviewers.includes(initial.secondReviewer)
      ? initial.secondReviewer
      : ""
  );
  const [showBothScores, setShowBothScores] = useState(initial?.showBothScores ?? false);
  const [secondReviewerRating, setSecondReviewerRating] = useState(
    initial?.secondReviewerRating?.toString() ?? ""
  );

  const [secondReviewerVideoKey, setSecondReviewerVideoKey] = useState<string | undefined>(
    initial?.secondReviewerVideoKey
  );
  const [secondReviewerVideoFile, setSecondReviewerVideoFile] = useState<File | null>(null);
  const [secondReviewerVideoProgress, setSecondReviewerVideoProgress] = useState<
    number | null
  >(null);
  const [secondReviewerVideoPhase, setSecondReviewerVideoPhase] = useState<
    "compressing" | "uploading"
  >("uploading");
  const [secondReviewerVideoQuality, setSecondReviewerVideoQuality] = useState<
    "full" | VideoQuality
  >("full");

  const [secondReviewerThumbnailKey, setSecondReviewerThumbnailKey] = useState<
    string | undefined
  >(initial?.secondReviewerThumbnailKey);
  const [secondReviewerCropperFile, setSecondReviewerCropperFile] = useState<File | null>(
    null
  );
  const [secondReviewerThumbnailBlob, setSecondReviewerThumbnailBlob] =
    useState<Blob | null>(null);
  const [secondReviewerThumbnailPreviewUrl, setSecondReviewerThumbnailPreviewUrl] =
    useState<string | null>(null);
  const [secondReviewerThumbnailProgress, setSecondReviewerThumbnailProgress] = useState<
    number | null
  >(null);

  // Third reviewer — mirrors the second-reviewer setup above.
  const [hasThirdReviewer, setHasThirdReviewer] = useState(!!initial?.thirdReviewer);
  const [thirdReviewer, setThirdReviewer] = useState(initial?.thirdReviewer ?? "");
  const [isThirdGuestReviewer, setIsThirdGuestReviewer] = useState(
    initial?.thirdReviewer ? !reviewers.includes(initial.thirdReviewer) : false
  );
  const [thirdGuestName, setThirdGuestName] = useState(
    initial?.thirdReviewer && !reviewers.includes(initial.thirdReviewer) ? initial.thirdReviewer : ""
  );
  const [thirdReviewerRating, setThirdReviewerRating] = useState(
    initial?.thirdReviewerRating?.toString() ?? ""
  );
  const [thirdReviewerVideoKey, setThirdReviewerVideoKey] = useState<string | undefined>(
    initial?.thirdReviewerVideoKey
  );
  const [thirdReviewerVideoFile, setThirdReviewerVideoFile] = useState<File | null>(null);
  const [thirdReviewerVideoProgress, setThirdReviewerVideoProgress] = useState<number | null>(null);
  const [thirdReviewerVideoPhase, setThirdReviewerVideoPhase] = useState<
    "compressing" | "uploading"
  >("uploading");
  const [thirdReviewerVideoQuality, setThirdReviewerVideoQuality] = useState<"full" | VideoQuality>(
    "full"
  );
  const [thirdReviewerThumbnailKey, setThirdReviewerThumbnailKey] = useState<string | undefined>(
    initial?.thirdReviewerThumbnailKey
  );
  const [thirdReviewerCropperFile, setThirdReviewerCropperFile] = useState<File | null>(null);
  const [thirdReviewerThumbnailBlob, setThirdReviewerThumbnailBlob] = useState<Blob | null>(null);
  const [thirdReviewerThumbnailPreviewUrl, setThirdReviewerThumbnailPreviewUrl] = useState<
    string | null
  >(null);
  const [thirdReviewerThumbnailProgress, setThirdReviewerThumbnailProgress] = useState<
    number | null
  >(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function handleThumbnailPicked(file: File | undefined) {
    if (!file) return;
    setCropperFile(file);
  }

  function handleCropConfirm(blob: Blob) {
    setThumbnailBlob(blob);
    setThumbnailPreviewUrl(URL.createObjectURL(blob));
    setCropperFile(null);
  }

  function handleSecondReviewerThumbnailPicked(file: File | undefined) {
    if (!file) return;
    setSecondReviewerCropperFile(file);
  }

  function handleSecondReviewerCropConfirm(blob: Blob) {
    setSecondReviewerThumbnailBlob(blob);
    setSecondReviewerThumbnailPreviewUrl(URL.createObjectURL(blob));
    setSecondReviewerCropperFile(null);
  }

  function handleThirdReviewerThumbnailPicked(file: File | undefined) {
    if (!file) return;
    setThirdReviewerCropperFile(file);
  }

  function handleThirdReviewerCropConfirm(blob: Blob) {
    setThirdReviewerThumbnailBlob(blob);
    setThirdReviewerThumbnailPreviewUrl(URL.createObjectURL(blob));
    setThirdReviewerCropperFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      setError("Pick at least one category.");
      return;
    }
    if (isGuestReviewer && !guestName.trim()) {
      setError("Enter the guest reviewer's name.");
      return;
    }
    if (hasSecondReviewer && isSecondGuestReviewer && !secondGuestName.trim()) {
      setError("Enter the second reviewer's name.");
      return;
    }
    if (hasSecondReviewer && !secondReviewer.trim()) {
      setError("Pick who the second reviewer is.");
      return;
    }
    if (hasThirdReviewer && isThirdGuestReviewer && !thirdGuestName.trim()) {
      setError("Enter the third reviewer's name.");
      return;
    }
    if (hasThirdReviewer && !thirdReviewer.trim()) {
      setError("Pick who the third reviewer is.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      let finalThumbnailKey = thumbnailKey;
      if (thumbnailBlob) {
        setThumbnailProgress(0);
        finalThumbnailKey = await uploadFile(
          thumbnailBlob,
          "thumbnail.webp",
          "thumbnails",
          setThumbnailProgress
        );
        setThumbnailProgress(null);
      }

      let finalVideoKey = videoKey;
      if (videoFile) {
        let uploadBlob: File | Blob = videoFile;
        let uploadName = videoFile.name;
        if (videoQuality !== "full") {
          setVideoPhase("compressing");
          setVideoProgress(0);
          try {
            uploadBlob = await compressVideo(videoFile, setVideoProgress, videoQuality);
            uploadName = "video.mp4";
          } catch (err) {
            console.error("Video compression failed, uploading the original file instead", err);
          }
        }
        setVideoPhase("uploading");
        setVideoProgress(0);
        finalVideoKey = await uploadFile(uploadBlob, uploadName, "videos", setVideoProgress);
        setVideoProgress(null);
      }

      let finalSecondReviewerThumbnailKey = secondReviewerThumbnailKey;
      if (hasSecondReviewer && secondReviewerThumbnailBlob) {
        setSecondReviewerThumbnailProgress(0);
        finalSecondReviewerThumbnailKey = await uploadFile(
          secondReviewerThumbnailBlob,
          "thumbnail.webp",
          "thumbnails",
          setSecondReviewerThumbnailProgress
        );
        setSecondReviewerThumbnailProgress(null);
      }

      let finalSecondReviewerVideoKey = secondReviewerVideoKey;
      if (hasSecondReviewer && secondReviewerVideoFile) {
        let uploadBlob: File | Blob = secondReviewerVideoFile;
        let uploadName = secondReviewerVideoFile.name;
        if (secondReviewerVideoQuality !== "full") {
          setSecondReviewerVideoPhase("compressing");
          setSecondReviewerVideoProgress(0);
          try {
            uploadBlob = await compressVideo(
              secondReviewerVideoFile,
              setSecondReviewerVideoProgress,
              secondReviewerVideoQuality
            );
            uploadName = "video.mp4";
          } catch (err) {
            console.error("Video compression failed, uploading the original file instead", err);
          }
        }
        setSecondReviewerVideoPhase("uploading");
        setSecondReviewerVideoProgress(0);
        finalSecondReviewerVideoKey = await uploadFile(
          uploadBlob,
          uploadName,
          "videos",
          setSecondReviewerVideoProgress
        );
        setSecondReviewerVideoProgress(null);
      }

      let finalThirdReviewerThumbnailKey = thirdReviewerThumbnailKey;
      if (hasThirdReviewer && thirdReviewerThumbnailBlob) {
        setThirdReviewerThumbnailProgress(0);
        finalThirdReviewerThumbnailKey = await uploadFile(
          thirdReviewerThumbnailBlob,
          "thumbnail.webp",
          "thumbnails",
          setThirdReviewerThumbnailProgress
        );
        setThirdReviewerThumbnailProgress(null);
      }

      let finalThirdReviewerVideoKey = thirdReviewerVideoKey;
      if (hasThirdReviewer && thirdReviewerVideoFile) {
        let uploadBlob: File | Blob = thirdReviewerVideoFile;
        let uploadName = thirdReviewerVideoFile.name;
        if (thirdReviewerVideoQuality !== "full") {
          setThirdReviewerVideoPhase("compressing");
          setThirdReviewerVideoProgress(0);
          try {
            uploadBlob = await compressVideo(
              thirdReviewerVideoFile,
              setThirdReviewerVideoProgress,
              thirdReviewerVideoQuality
            );
            uploadName = "video.mp4";
          } catch (err) {
            console.error("Video compression failed, uploading the original file instead", err);
          }
        }
        setThirdReviewerVideoPhase("uploading");
        setThirdReviewerVideoProgress(0);
        finalThirdReviewerVideoKey = await uploadFile(
          uploadBlob,
          uploadName,
          "videos",
          setThirdReviewerVideoProgress
        );
        setThirdReviewerVideoProgress(null);
      }

      const payload = {
        title: title.trim(),
        store: store.trim(),
        city,
        categories: selectedCategories,
        rating: parseFloat(rating),
        price: price.trim() || undefined,
        description: description.trim(),
        reviewer: reviewer.trim(),
        status,
        videoKey: finalVideoKey,
        thumbnailKey: finalThumbnailKey,
        secondReviewer: hasSecondReviewer ? secondReviewer.trim() : undefined,
        secondReviewerVideoKey: hasSecondReviewer ? finalSecondReviewerVideoKey : undefined,
        secondReviewerThumbnailKey: hasSecondReviewer
          ? finalSecondReviewerThumbnailKey
          : undefined,
        secondReviewerRating:
          hasSecondReviewer && secondReviewerRating
            ? parseFloat(secondReviewerRating)
            : undefined,
        thirdReviewer: hasThirdReviewer ? thirdReviewer.trim() : undefined,
        thirdReviewerVideoKey: hasThirdReviewer ? finalThirdReviewerVideoKey : undefined,
        thirdReviewerThumbnailKey: hasThirdReviewer ? finalThirdReviewerThumbnailKey : undefined,
        thirdReviewerRating:
          hasThirdReviewer && thirdReviewerRating ? parseFloat(thirdReviewerRating) : undefined,
        showBothScores: hasSecondReviewer ? showBothScores : false,
        originalReviewSlug: originalReviewSlug || undefined,
        durationSeconds,
        lat: location.lat,
        lng: location.lng,
        mapAddress: location.address,
      };

      const url =
        mode === "create"
          ? "/api/admin/reviews"
          : `/api/admin/reviews/${initial!.slug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
      setVideoProgress(null);
      setThumbnailProgress(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <>
      {cropperFile && (
        <ImageCropper
          file={cropperFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropperFile(null)}
        />
      )}
      {secondReviewerCropperFile && (
        <ImageCropper
          file={secondReviewerCropperFile}
          onConfirm={handleSecondReviewerCropConfirm}
          onCancel={() => setSecondReviewerCropperFile(null)}
        />
      )}
      {thirdReviewerCropperFile && (
        <ImageCropper
          file={thirdReviewerCropperFile}
          onConfirm={handleThirdReviewerCropConfirm}
          onCancel={() => setThirdReviewerCropperFile(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
        <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-foreground/70">
          <p className="font-bold text-foreground">How to add a review</p>
          <p className="mt-1">
            Fill in the details below. Near the bottom, tap the boxes to upload the video and a thumbnail photo. When you&apos;re done, hit the big red button at the very bottom to save it.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Video title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder='e.g. "This Pizza Almost Made Us Fight"'
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Store name
            </label>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              City / Town
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              list="city-suggestions"
              placeholder="Pick a suggestion or type any town"
              required
              className={inputClass}
            />
            <datalist id="city-suggestions">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Store location (map)
          </label>
          <p className="mb-2 text-xs text-foreground/55">
            Paste the store&apos;s Google Maps link (from the app&apos;s Share button) or type its
            name/address, hit Find, then fine-tune the pin. This is what shows on the Map.
          </p>
          <LocationPicker
            lat={location.lat}
            lng={location.lng}
            address={location.address}
            onChange={setLocation}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Categories (pick all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedCategories.includes(cat)
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground/70 hover:border-primary hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Rating (1-10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Price (optional)
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              list="price-suggestions"
              placeholder="e.g. $, $$, or $12.99"
              className={inputClass}
            />
            <datalist id="price-suggestions">
              {prices.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Reviewer
          </label>
          <div className="flex flex-wrap gap-2">
            {reviewers.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => {
                  setIsGuestReviewer(false);
                  setReviewer(r);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  !isGuestReviewer && reviewer === r
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
                }`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsGuestReviewer(true);
                setReviewer(guestName);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isGuestReviewer
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
              }`}
            >
              Guest Reviewer
            </button>
          </div>
          {isGuestReviewer && (
            <input
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setReviewer(e.target.value);
              }}
              placeholder="Guest's name"
              required
              className={`${inputClass} mt-2 max-w-xs`}
            />
          )}
        </div>

        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={hasSecondReviewer}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasSecondReviewer(checked);
                if (!checked) {
                  setSecondReviewer("");
                  setIsSecondGuestReviewer(false);
                  setSecondGuestName("");
                }
              }}
              className="h-4 w-4"
            />
            Add a second reviewer (two people reviewed this same video)
          </label>
          {hasSecondReviewer && (
            <>
              <p className="mb-2 text-xs text-foreground/50">
                Pick who else reviewed this. Viewers will get a switch between the two
                reviewers on the video page.
              </p>
              <div className="flex flex-wrap gap-2">
                {reviewers
                  .filter((r) => r !== reviewer)
                  .map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setIsSecondGuestReviewer(false);
                        setSecondReviewer(r);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        !isSecondGuestReviewer && secondReviewer === r
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsSecondGuestReviewer(true);
                    setSecondReviewer(secondGuestName);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    isSecondGuestReviewer
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
                  }`}
                >
                  Guest Reviewer
                </button>
              </div>
              {isSecondGuestReviewer && (
                <input
                  value={secondGuestName}
                  onChange={(e) => {
                    setSecondGuestName(e.target.value);
                    setSecondReviewer(e.target.value);
                  }}
                  placeholder="Guest's name"
                  required
                  className={`${inputClass} mt-2 max-w-xs`}
                />
              )}
              <div className="mt-3 max-w-xs">
                <label className="mb-1 block text-sm font-semibold text-foreground">
                  {secondReviewer ? `${secondReviewer}'s rating (1-10)` : "Second reviewer's rating (1-10)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={secondReviewerRating}
                  onChange={(e) => setSecondReviewerRating(e.target.value)}
                  placeholder="Leave blank to reuse the first rating"
                  className={inputClass}
                />
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={showBothScores}
                  onChange={(e) => setShowBothScores(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  Show <strong>both scores</strong> on the review card (one for each reviewer). Off
                  by default — the card just shows the first reviewer&apos;s score.
                </span>
              </label>
            </>
          )}
        </div>

        {hasSecondReviewer && (
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={hasThirdReviewer}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasThirdReviewer(checked);
                  if (!checked) {
                    setThirdReviewer("");
                    setIsThirdGuestReviewer(false);
                    setThirdGuestName("");
                  }
                }}
                className="h-4 w-4"
              />
              Add a third reviewer (three people reviewed this same video)
            </label>
            {hasThirdReviewer && (
              <>
                <p className="mb-2 text-xs text-foreground/50">
                  Pick who else reviewed this. Viewers get a switch between all three reviewers on
                  the video page.
                </p>
                <div className="flex flex-wrap gap-2">
                  {reviewers
                    .filter((r) => r !== reviewer && r !== secondReviewer)
                    .map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => {
                          setIsThirdGuestReviewer(false);
                          setThirdReviewer(r);
                        }}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          !isThirdGuestReviewer && thirdReviewer === r
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsThirdGuestReviewer(true);
                      setThirdReviewer(thirdGuestName);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isThirdGuestReviewer
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
                    }`}
                  >
                    Guest Reviewer
                  </button>
                </div>
                {isThirdGuestReviewer && (
                  <input
                    value={thirdGuestName}
                    onChange={(e) => {
                      setThirdGuestName(e.target.value);
                      setThirdReviewer(e.target.value);
                    }}
                    placeholder="Guest's name"
                    required
                    className={`${inputClass} mt-2 max-w-xs`}
                  />
                )}
                <div className="mt-3 max-w-xs">
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    {thirdReviewer ? `${thirdReviewer}'s rating (1-10)` : "Third reviewer's rating (1-10)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={thirdReviewerRating}
                    onChange={(e) => setThirdReviewerRating(e.target.value)}
                    placeholder="Leave blank to reuse the first rating"
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          {showLinkPicker ? (
            <>
              <label className="mb-1 block text-sm font-semibold text-foreground">
                Follow-up to an earlier review?
              </label>
              <p className="mb-2 text-xs text-foreground/50">
                Pick the review this one revisits. Both pages will show a link between them.
              </p>
              <select
                value={originalReviewSlug}
                onChange={(e) => setOriginalReviewSlug(e.target.value)}
                className={`${inputClass} max-w-md`}
              >
                <option value="">— None (standalone review) —</option>
                {allReviews
                  .filter((r) => r.slug !== initial?.slug)
                  .map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.title}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setOriginalReviewSlug("");
                  setShowLinkPicker(false);
                }}
                className="mt-2 block text-xs font-semibold text-foreground/40 hover:text-primary"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowLinkPicker(true)}
              className="text-xs font-semibold text-foreground/40 hover:text-primary"
            >
              ↩ Link this to an earlier review (a revisit) — optional
            </button>
          )}
        </div>

        <div>
          <MediaUploadFields
            label={hasSecondReviewer ? reviewer : undefined}
            thumbnailKey={thumbnailKey}
            thumbnailPreviewUrl={thumbnailPreviewUrl}
            thumbnailProgress={thumbnailProgress}
            onThumbnailPicked={handleThumbnailPicked}
            videoKey={videoKey}
            videoFile={videoFile}
            videoProgress={videoProgress}
            videoPhase={videoPhase}
            onVideoPicked={(file) => setVideoFile(file ?? null)}
            videoQuality={videoQuality}
            onVideoQualityChange={setVideoQuality}
          />
        </div>

        {hasSecondReviewer && (
          <div>
            <p className="mb-2 text-xs text-foreground/50">
              Optional — only add {secondReviewer || "the second reviewer"}&apos;s
              video/thumbnail below if they filmed a separate reaction. Viewers will get a
              switch between the two on the video page.
            </p>
            <MediaUploadFields
              label={secondReviewer || "Second reviewer"}
              thumbnailKey={secondReviewerThumbnailKey}
              thumbnailPreviewUrl={secondReviewerThumbnailPreviewUrl}
              thumbnailProgress={secondReviewerThumbnailProgress}
              onThumbnailPicked={handleSecondReviewerThumbnailPicked}
              videoKey={secondReviewerVideoKey}
              videoFile={secondReviewerVideoFile}
              videoProgress={secondReviewerVideoProgress}
              videoPhase={secondReviewerVideoPhase}
              onVideoPicked={(file) => setSecondReviewerVideoFile(file ?? null)}
              videoQuality={secondReviewerVideoQuality}
              onVideoQualityChange={setSecondReviewerVideoQuality}
            />
          </div>
        )}

        {hasThirdReviewer && (
          <div>
            <p className="mb-2 text-xs text-foreground/50">
              Optional — only add {thirdReviewer || "the third reviewer"}&apos;s video/thumbnail
              below if they filmed a separate reaction. Viewers get a switch between all three on
              the video page.
            </p>
            <MediaUploadFields
              label={thirdReviewer || "Third reviewer"}
              thumbnailKey={thirdReviewerThumbnailKey}
              thumbnailPreviewUrl={thirdReviewerThumbnailPreviewUrl}
              thumbnailProgress={thirdReviewerThumbnailProgress}
              onThumbnailPicked={handleThirdReviewerThumbnailPicked}
              videoKey={thirdReviewerVideoKey}
              videoFile={thirdReviewerVideoFile}
              videoProgress={thirdReviewerVideoProgress}
              videoPhase={thirdReviewerVideoPhase}
              onVideoPicked={(file) => setThirdReviewerVideoFile(file ?? null)}
              videoQuality={thirdReviewerVideoQuality}
              onVideoQualityChange={setThirdReviewerVideoQuality}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Visibility
          </label>
          {visibilityLocked ? (
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-foreground/60">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <span className="text-sm font-semibold text-foreground">
                  {initial?.status === "vault"
                    ? "This video is in the Vault"
                    : "This video is Locked"}
                </span>
              </div>
              <p className="mt-2 text-xs text-foreground/60">
                Its visibility is frozen. You can still edit the details above, but to move
                it out of the {initial?.status === "vault" ? "Vault" : "Locked"} area (or make
                it public), enter the security passcode in{" "}
                <span className="font-semibold">Settings</span> first.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("published")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    status === "published"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-border bg-surface text-foreground/70"
                  }`}
                >
                  Published (public)
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("draft")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    status === "draft"
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border bg-surface text-foreground/70"
                  }`}
                >
                  Private / Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("locked")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    status === "locked"
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-foreground/70"
                  }`}
                >
                  Locked (passcode)
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("vault")}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    status === "vault"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-foreground/70"
                  }`}
                >
                  Vault (2nd passcode)
                </button>
              </div>
              {status === "locked" && (
                <p className="mt-2 text-xs text-foreground/50">
                  Visible under the site&apos;s &quot;Locked&quot; menu, only to visitors who enter the passcode.
                </p>
              )}
              {status === "vault" && (
                <p className="mt-2 text-xs text-foreground/50">
                  Hidden inside the Vault — visitors need the Locked passcode first, then the Vault
                  passcode on top of it.
                </p>
              )}
            </>
          )}
        </div>

        {error && <p className="text-sm text-primary">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {submitting
            ? thumbnailProgress !== null
              ? `Uploading thumbnail... ${thumbnailProgress}%`
              : videoProgress !== null
              ? videoPhase === "compressing"
                ? `Compressing video... ${videoProgress}%`
                : `Uploading video... ${videoProgress}%`
              : "Saving..."
            : mode === "create"
            ? "Create Review"
            : "Save Changes"}
        </button>
      </form>
    </>
  );
}
