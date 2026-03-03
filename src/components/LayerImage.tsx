"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Threshold: pixels with r,g,b all below this are made transparent (for PNGs that have black fill instead of alpha). */
const BLACK_THRESHOLD = 28;

type LayerImageProps = {
  src: string;
  alt: string;
  fill: boolean;
  className?: string;
  sizes?: string;
  style?: React.CSSProperties;
  zIndex: number;
};

/**
 * Renders a layer image. If the image has a solid black background (no real transparency),
 * we try to convert near-black pixels to transparent so it composites correctly.
 */
export function LayerImage({ src, alt, fill, className, sizes, style, zIndex }: LayerImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || failed) return;
    setProcessedSrc(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(data, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        setProcessedSrc(dataUrl);
      } catch {
        setFailed(true);
      }
    };
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src, failed]);

  const displaySrc = processedSrc || src;
  return (
    <Image
      src={displaySrc}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      unoptimized
      style={{ ...style, zIndex }}
    />
  );
}
