"use client";

import { useEffect, useState } from "react";
import { CoverImage } from "@/components/CoverImage";

type CoverBackdropProps = {
  src?: string | null;
  alt?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  /** Rendered width hint for the optimiser. Defaults to an idea card. */
  sizes?: string;
  priority?: boolean;
};

/** Library-card width: full width on phones, ~360px in the grid. */
export const IDEA_CARD_SIZES = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

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
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`transition-opacity duration-200 ${loaded ? imageClassName : "opacity-0"}`}
      />
    </div>
  );
}
