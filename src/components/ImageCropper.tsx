"use client";

import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ImageCropper({
  file,
  outputWidth = 1280,
  outputHeight = 720,
  round = false,
  title = "Position the Thumbnail",
  subtitle = "Drag to move the photo. Pinch (or scroll) to zoom in and out.",
  confirmLabel = "Use This Photo",
  onConfirm,
  onCancel,
}: {
  file: File;
  outputWidth?: number;
  outputHeight?: number;
  round?: boolean;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const ASPECT = outputWidth / outputHeight;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ w: 480, h: 480 / ASPECT });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scaleRef = useRef(scale);
  const posRef = useRef(pos);
  useEffect(() => {
    scaleRef.current = scale;
    posRef.current = pos;
  }, [scale, pos]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number; mid: { x: number; y: number } } | null>(
    null
  );

  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      setBox({ w, h: w / ASPECT });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ASPECT]);

  function clampPos(x: number, y: number, s: number, size: { w: number; h: number }, b = box) {
    return {
      x: clamp(x, b.w - size.w * s, 0),
      y: clamp(y, b.h - size.h * s, 0),
    };
  }

  function fitImage() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const s = Math.max(box.w / w, box.h / h);
    setImgSize({ w, h });
    setMinScale(s);
    setScale(s);
    setPos({ x: (box.w - w * s) / 2, y: (box.h - h * s) / 2 });
  }

  useEffect(() => {
    if (imgSize) fitImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w, box.h]);

  function applyZoom(newScale: number, anchor: { x: number; y: number }) {
    if (!imgSize) return;
    const clampedScale = clamp(newScale, minScale, minScale * 4);
    const imgPtX = (anchor.x - posRef.current.x) / scaleRef.current;
    const imgPtY = (anchor.y - posRef.current.y) / scaleRef.current;
    const rawX = anchor.x - imgPtX * clampedScale;
    const rawY = anchor.y - imgPtY * clampedScale;
    const next = clampPos(rawX, rawY, clampedScale, imgSize);
    setScale(clampedScale);
    setPos(next);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    } else if (pointers.current.size === 2) {
      dragStart.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: scaleRef.current,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current && imgSize) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / pinchStart.current.dist;
      const rect = containerRef.current?.getBoundingClientRect();
      const anchor = rect
        ? { x: pinchStart.current.mid.x - rect.left, y: pinchStart.current.mid.y - rect.top }
        : { x: box.w / 2, y: box.h / 2 };
      applyZoom(pinchStart.current.scale * ratio, anchor);
      return;
    }

    if (pointers.current.size === 1 && dragStart.current && imgSize) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const next = clampPos(
        dragStart.current.posX + dx,
        dragStart.current.posY + dy,
        scaleRef.current,
        imgSize
      );
      setPos(next);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    dragStart.current = null;
    pinchStart.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      dragStart.current = { x: p.x, y: p.y, posX: posRef.current.x, posY: posRef.current.y };
    }
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !imgSize) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const factor = Math.exp(-e.deltaY * 0.002);
      applyZoom(scaleRef.current * factor, anchor);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize, box.w, box.h, minScale]);

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !imgSize) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sourceX = -pos.x / scale;
    const sourceY = -pos.y / scale;
    const sourceW = box.w / scale;
    const sourceH = box.h / scale;

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, outputWidth, outputHeight);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/webp",
      0.8
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-5 shadow-xl">
        <h3 className="font-display text-xl tracking-wide text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-foreground/60">{subtitle}</p>

        <div
          ref={containerRef}
          className="relative mt-4 touch-none overflow-hidden rounded-lg border border-border bg-black"
          style={{ width: "100%", height: box.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Crop preview"
              onLoad={fitImage}
              draggable={false}
              className="absolute left-0 top-0 max-w-none cursor-grab select-none active:cursor-grabbing"
              style={
                imgSize
                  ? {
                      width: imgSize.w * scale,
                      height: imgSize.h * scale,
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }
                  : undefined
              }
            />
          )}
          {round && (
            <div
              className="pointer-events-none absolute inset-0 border-2 border-black"
              style={{ boxShadow: "0 0 0 1000px rgba(0,0,0,0.55)", borderRadius: "9999px" }}
            />
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground/70 hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
