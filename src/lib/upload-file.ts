"use client";

import { resizeImageMaxDimension } from "@/lib/resize-image";

export function uploadFile(
  file: File | Blob,
  filename: string,
  folder: "videos" | "thumbnails",
  onProgress: (pct: number) => void,
  endpoint: string = "/api/admin/upload-url"
): Promise<string> {
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType: file.type, folder }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Could not get upload URL");
      return res.json();
    })
    .then(({ uploadUrl, key }) => {
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(key);
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });
    });
}

/**
 * Makes the small (640px) copy of a thumbnail that's already uploaded at
 * `thumbnailKey`, from the same image, and uploads it next to it.
 */
export async function uploadSmallThumbnail(
  image: Blob,
  thumbnailKey: string,
  endpoint: string = "/api/admin/upload-url"
): Promise<void> {
  const small = await resizeImageMaxDimension(image, 640, 0.75);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "thumbnails-small", sourceKey: thumbnailKey }),
  });
  if (!res.ok) throw new Error("Could not get upload URL");
  const { uploadUrl } = await res.json();
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: small,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
}
