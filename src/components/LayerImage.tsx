"use client";

import { useEffect, useState } from "react";

/** Only pixels with r,g,b ALL below this are made transparent (black). */
const PURE_BLACK_THRESHOLD = 4;
/** Only pixels with r,g,b ALL above this are made transparent (white) when not using corner sample. */
const PURE_WHITE_THRESHOLD = 238;
/** Tolerance for matching corner white in auto mode (removes off-whites and dial cutout). */
const WHITE_TOLERANCE = 28;
/** Tolerance for "same grey" when removing grey background (max difference between r,g,b). */
const GREY_TOLERANCE = 12;
/** How many pixels from each corner to sample for auto-detect (per corner). */
const CORNER_SAMPLE = 3;

export type RemoveSolidBackground = "off" | "black" | "white" | "grey" | "auto";

type LayerImageProps = {
  src: string;
  alt: string;
  fill: boolean;
  className?: string;
  sizes?: string;
  style?: React.CSSProperties;
  zIndex: number;
  /**
   * Remove solid black/white/grey background so layer composites correctly.
   * Use when PNG was exported without alpha or alpha was lost (e.g. on some browsers/OS).
   * - "off": show as-is (proper PNG with alpha).
   * - "black" / "white" / "grey": treat that color as transparent.
   * - "auto": detect from image (sample corners) and remove that background.
   */
  removeSolidBackground?: RemoveSolidBackground;
  /**
   * If true, same as removeSolidBackground="black". Kept for backward compatibility.
   */
  convertBlackToTransparent?: boolean;
  /**
   * Optional: max r,g,b for black removal. Default 4. Only used when removing black.
   */
  blackToTransparentThreshold?: number;
};

function getMode(
  removeSolidBackground: RemoveSolidBackground | undefined,
  convertBlackToTransparent: boolean | undefined
): RemoveSolidBackground {
  if (convertBlackToTransparent) return "black";
  return removeSolidBackground ?? "off";
}

/**
 * Sample average color from one corner (top-left, top-right, bottom-left, or bottom-right).
 */
function sampleOneCorner(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  stride: number,
  corner: "tl" | "tr" | "bl" | "br"
): { r: number; g: number; b: number } {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  const s = Math.min(CORNER_SAMPLE, Math.min(w, h));
  const x0 = corner === "tl" || corner === "bl" ? 0 : w - s;
  const y0 = corner === "tl" || corner === "tr" ? 0 : h - s;
  for (let dy = 0; dy < s; dy++) {
    for (let dx = 0; dx < s; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      const i = (y * w + x) * stride;
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
      n++;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Sample all four corners; if at least 3 agree on black/white/grey, return that mode and average corner color.
 */
function detectBackgroundFromCorners(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  stride: number
): { mode: "black" | "white" | "grey"; cornerR: number; cornerG: number; cornerB: number } | null {
  const tl = sampleOneCorner(d, w, h, stride, "tl");
  const tr = sampleOneCorner(d, w, h, stride, "tr");
  const bl = sampleOneCorner(d, w, h, stride, "bl");
  const br = sampleOneCorner(d, w, h, stride, "br");
  const corners = [tl, tr, bl, br];
  const types = corners.map((c) => classifyBackground(c));
  // Require at least 3 of 4 corners to agree (one corner may hit the watch edge)
  const counts = { black: 0, white: 0, grey: 0 };
  for (const t of types) counts[t]++;
  let mode: "black" | "white" | "grey" | null =
    counts.white >= 3 ? "white" : counts.black >= 3 ? "black" : counts.grey >= 3 ? "grey" : null;
  if (mode === null) return null;
  const same = corners.filter((_, i) => types[i] === mode);
  const n = same.length;
  const cornerR = same.reduce((a, c) => a + c.r, 0) / n;
  const cornerG = same.reduce((a, c) => a + c.g, 0) / n;
  const cornerB = same.reduce((a, c) => a + c.b, 0) / n;
  return { mode, cornerR, cornerG, cornerB };
}

/**
 * Classify corner color as black, white, or grey (for auto removal).
 */
function classifyBackground(
  c: { r: number; g: number; b: number }
): "black" | "white" | "grey" {
  const avg = (c.r + c.g + c.b) / 3;
  const spread = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  if (avg < 25 && spread < 15) return "black";
  if (avg > 230 && spread < 15) return "white";
  return "grey";
}

/**
 * Renders a layer image. By default shows the image as-is so it matches the PNG.
 * Use removeSolidBackground (or convertBlackToTransparent) for assets with solid black/white/grey instead of alpha.
 */
export function LayerImage({
  src,
  alt,
  fill,
  className,
  sizes,
  style,
  zIndex,
  removeSolidBackground,
  convertBlackToTransparent = false,
  blackToTransparentThreshold,
}: LayerImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [readySrc, setReadySrc] = useState<string | null>(null);

  const mode = getMode(removeSolidBackground, convertBlackToTransparent);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setProcessedSrc(null);
    setReadySrc(null);

    const useAsIs = () => {
      if (!cancelled) setReadySrc(src);
    };

    if (mode === "off") {
      useAsIs();
      return;
    }

    const blackThreshold = blackToTransparentThreshold ?? PURE_BLACK_THRESHOLD;

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
          useAsIs();
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h);
        const d = data.data;
        const totalPixels = w * h;
        const stride = 4;

        // If image already has meaningful transparency, don't alter it.
        let transparentCount = 0;
        for (let i = 3; i < d.length; i += 4) {
          if (d[i] < 255) transparentCount++;
        }
        if (transparentCount > totalPixels * 0.003) {
          useAsIs();
          return;
        }

        let effectiveMode: "black" | "white" | "grey" = mode === "auto" ? "black" : mode;
        let cornerR = 0,
          cornerG = 0,
          cornerB = 0;

        if (mode === "auto") {
          const detected = detectBackgroundFromCorners(d, w, h, stride);
          if (detected) {
            effectiveMode = detected.mode;
            cornerR = detected.cornerR;
            cornerG = detected.cornerG;
            cornerB = detected.cornerB;
          } else {
            useAsIs();
            return;
          }
        }

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          let makeTransparent = false;

          if (effectiveMode === "black") {
            makeTransparent = r <= blackThreshold && g <= blackThreshold && b <= blackThreshold;
          } else if (effectiveMode === "white") {
            // Auto-detected white: remove pixels matching corner (background + dial opening). Else use fixed threshold.
            if (cornerR > 200) {
              makeTransparent =
                Math.abs(r - cornerR) <= WHITE_TOLERANCE &&
                Math.abs(g - cornerG) <= WHITE_TOLERANCE &&
                Math.abs(b - cornerB) <= WHITE_TOLERANCE;
            } else {
              makeTransparent =
                r >= PURE_WHITE_THRESHOLD &&
                g >= PURE_WHITE_THRESHOLD &&
                b >= PURE_WHITE_THRESHOLD;
            }
          } else {
            // grey: remove pixels close to the corner color (neutral and matching)
            const spread = Math.max(r, g, b) - Math.min(r, g, b);
            const match =
              spread <= GREY_TOLERANCE &&
              Math.abs(r - cornerR) <= GREY_TOLERANCE * 2 &&
              Math.abs(g - cornerG) <= GREY_TOLERANCE * 2 &&
              Math.abs(b - cornerB) <= GREY_TOLERANCE * 2;
            makeTransparent = match;
          }

          if (makeTransparent) d[i + 3] = 0;
        }
        ctx.putImageData(data, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        if (!cancelled) {
          setProcessedSrc(dataUrl);
          setReadySrc(dataUrl);
        }
      } catch {
        useAsIs();
      }
    };
    img.onerror = useAsIs;
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, mode, blackToTransparentThreshold]);

  const displaySrc = readySrc ?? processedSrc;
  if (!displaySrc) return null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "center",
        ...style,
        zIndex,
      }}
      draggable={false}
    />
  );
}
