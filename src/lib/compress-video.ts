"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

export type VideoQuality = "1080p" | "720p" | "480p" | "360p";

const QUALITY_PRESETS: Record<VideoQuality, { longSide: number; crf: number }> = {
  "1080p": { longSide: 1920, crf: 24 },
  "720p": { longSide: 1280, crf: 25 },
  "480p": { longSide: 854, crf: 26 },
  "360p": { longSide: 640, crf: 27 },
};

export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void,
  quality: VideoQuality
): Promise<Blob> {
  const { longSide, crf } = QUALITY_PRESETS[quality];

  const ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(Math.min(99, Math.round(progress * 100)));
  });

  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL("/ffmpeg/ffmpeg-core.js", "text/javascript"),
    toBlobURL("/ffmpeg/ffmpeg-core.wasm", "application/wasm"),
  ]);
  // @ffmpeg/ffmpeg's own worker.js does a fully dynamic `import(coreURL)`,
  // which Next's bundler refuses to statically analyze. Point at our own
  // copy served as a plain static file instead, so it's never bundled —
  // just loaded natively by the browser at runtime, where a dynamic
  // import is completely normal. Must be a full absolute URL: the library
  // resolves classWorkerURL against its own bundled module's import.meta.url,
  // which isn't the page origin in Next's dev bundler.
  const classWorkerURL = new URL("/ffmpeg/worker.js", window.location.origin).toString();
  await ffmpeg.load({ classWorkerURL, coreURL, wasmURL });

  const inputName = "input" + (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".mp4");
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  await ffmpeg.exec([
    "-i",
    inputName,
    // Cap whichever dimension is longer (works for landscape or portrait
    // phone video) — e.g. "1080p" caps the long side at 1920, matching a
    // standard 1920x1080 or 1080x1920 frame.
    "-vf",
    `scale='if(gt(iw,ih),min(${longSide},iw),-2)':'if(gt(iw,ih),-2,min(${longSide},ih))'`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    String(crf),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  ffmpeg.terminate();

  onProgress(100);
  const bytes = new Uint8Array(data as Uint8Array);
  return new Blob([bytes], { type: "video/mp4" });
}
