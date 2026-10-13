"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicFileUrl } from "@/lib/media-url";
import { uploadSmallThumbnail } from "@/lib/upload-file";

/**
 * Makes the small copies for thumbnails uploaded before they existed. Runs in
 * the browser: downloads each full thumbnail, shrinks it, uploads the copy.
 */
export default function AdminSmallThumbnails({ missing }: { missing: string[] }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);

  async function handleRun() {
    setRunning(true);
    setDone(0);
    setFailed(0);
    for (const key of missing) {
      try {
        const url = getPublicFileUrl(key);
        if (!url) throw new Error("No URL");
        const res = await fetch(url);
        if (!res.ok) throw new Error("Download failed");
        await uploadSmallThumbnail(await res.blob(), key);
        setDone((n) => n + 1);
      } catch {
        setFailed((n) => n + 1);
      }
    }
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-foreground">Small thumbnails</h2>
      <p className="mt-1 text-sm text-foreground/60">
        {missing.length === 0
          ? "Every thumbnail has its small copy, so lists and grids load fast."
          : `${missing.length} thumbnail${missing.length === 1 ? " doesn't" : "s don't"} have a small copy yet. Without one, the site loads the full-size image there.`}
      </p>
      {missing.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {running ? "Making small copies…" : "Make small copies"}
          </button>
          {(running || done > 0 || failed > 0) && (
            <span className="text-sm text-foreground/60">
              {done} of {missing.length} done{failed > 0 ? ` · ${failed} failed` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
