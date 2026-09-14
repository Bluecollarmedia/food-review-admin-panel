"use client";

export function uploadFile(
  file: File | Blob,
  filename: string,
  folder: "videos" | "thumbnails",
  onProgress: (pct: number) => void
): Promise<string> {
  return fetch("/api/admin/upload-url", {
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
