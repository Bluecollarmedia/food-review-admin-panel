"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicFileUrl } from "@/lib/media-url";
import type { BucketFile } from "@/lib/r2";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function fileName(key: string): string {
  return key.split("/").pop() ?? key;
}

const SECTIONS: { prefix: string; label: string; isImage: boolean }[] = [
  { prefix: "videos/", label: "Videos", isImage: false },
  { prefix: "thumbnails/", label: "Thumbnails", isImage: true },
  { prefix: "avatars/", label: "Avatars", isImage: true },
  { prefix: "comment-images/", label: "Comment Photos", isImage: true },
];

function FileRow({
  file,
  isImage,
  deleting,
  onDelete,
}: {
  file: BucketFile;
  isImage: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const url = getPublicFileUrl(file.key);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
        {isImage && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-foreground/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{fileName(file.key)}</p>
        <p className="text-xs text-foreground/50">
          {formatBytes(file.size)} &middot; uploaded {new Date(file.lastModified).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}

export default function AdminStorageList({ files }: { files: BucketFile[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  async function handleDelete(key: string) {
    if (!confirm(`Delete this file from the bucket?\n\n${fileName(key)}\n\nThis can't be undone.`)) {
      return;
    }
    setDeleting(key);
    try {
      const res = await fetch("/api/admin/storage/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        setRemoved((prev) => new Set(prev).add(key));
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to delete.");
      }
    } finally {
      setDeleting(null);
    }
  }

  const visible = files.filter((f) => !removed.has(f.key));

  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((section) => {
        const sectionFiles = visible.filter((f) => f.key.startsWith(section.prefix));
        if (sectionFiles.length === 0) return null;
        const sectionBytes = sectionFiles.reduce((sum, f) => sum + f.size, 0);
        return (
          <div key={section.prefix}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-xl tracking-wide text-foreground">{section.label}</h2>
              <span className="text-xs text-foreground/50">
                {sectionFiles.length} &middot; {formatBytes(sectionBytes)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {sectionFiles.map((file) => (
                <FileRow
                  key={file.key}
                  file={file}
                  isImage={section.isImage}
                  deleting={deleting === file.key}
                  onDelete={() => handleDelete(file.key)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
