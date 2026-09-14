"use client";

import { useState } from "react";

type Item = { slug: string; videoUrl: string };

// Measure a video's length in the browser without downloading the whole file.
function readDuration(url: string, timeoutMs = 15000): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    let done = false;
    const finish = (val: number | null) => {
      if (done) return;
      done = true;
      v.removeAttribute("src");
      try {
        v.load();
      } catch {
        // ignore
      }
      resolve(val);
    };
    const t = setTimeout(() => finish(null), timeoutMs);
    v.onloadedmetadata = () => {
      clearTimeout(t);
      finish(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    };
    v.onerror = () => {
      clearTimeout(t);
      finish(null);
    };
    v.src = url;
  });
}

export default function BackfillDurations({ items }: { items: Item[] }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [filled, setFilled] = useState(0);
  const [finished, setFinished] = useState(false);

  async function run() {
    setRunning(true);
    setDone(0);
    setFilled(0);
    setFinished(false);
    let f = 0;
    // One at a time — keeps it reliable on iOS (which limits simultaneous video
    // elements) and easy on bandwidth.
    for (let i = 0; i < items.length; i++) {
      const dur = await readDuration(items[i].videoUrl);
      if (dur) {
        try {
          const res = await fetch(`/api/reviews/${items[i].slug}/duration`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds: dur }),
          });
          const d = await res.json();
          if (d.updated) f++;
        } catch {
          // ignore and continue
        }
      }
      setDone(i + 1);
      setFilled(f);
    }
    setFinished(true);
    setRunning(false);
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">
        {items.length} video{items.length === 1 ? "" : "s"} missing a duration
      </p>
      <p className="mt-0.5 text-xs text-foreground/55">
        Measure and save each one&apos;s length so the cards show the time.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {running
            ? `Working… ${done}/${items.length}`
            : finished
            ? "Run again"
            : "Fill in all durations"}
        </button>
        {finished && (
          <span className="text-sm text-foreground/70">
            Filled {filled}. Refresh to see them.
          </span>
        )}
      </div>
    </div>
  );
}
