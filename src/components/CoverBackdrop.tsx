"use client";

import { useState } from "react";
import { CoverImage } from "@/components/CoverImage";
import { IDEA_CARD_SIZES } from "@/lib/imageSizes";

type CoverBackdropProps = {
  src?: string | null;
  alt?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  /** Rendered width hint for the optimiser. Defaults to an idea card. */
  sizes?: string;
  priority?: boolean;
};


const fallbackStyle = {
  background:
    "radial-gradient(circle at 28% 18%, rgba(148, 163, 184, 0.22), transparent 30%), linear-gradient(135deg, #0f172a 0%, #111827 48%, #020617 100%)",
};

export function CoverBackdrop({
  src,
  alt = "Game cover",
  imageClassName = "opacity-60",
  fallbackClassName = "opacity-100",
  sizes = IDEA_CARD_SIZES,
  priority = false,
}: CoverBackdropProps) {
  // Track which src finished loading, so switching covers fades in again.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = Boolean(src) && loadedSrc === src;

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900">
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-200 ${loaded ? "opacity-0" : fallbackClassName}`}
        style={fallbackStyle}
      />
      <CoverImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoadedSrc(src ?? null)}
        onError={() => setLoadedSrc(src ?? null)}
        className={`transition-opacity duration-200 ${loaded ? imageClassName : "opacity-0"}`}
      />
    </div>
  );
}
