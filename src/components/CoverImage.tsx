"use client";

import Image, { getImageProps } from "next/image";
import { IDEA_CARD_SIZES } from "@/lib/imageSizes";
import { useState } from "react";

const REMOTE_IMAGE = /^https?:\/\//i;

type CoverImageProps = {
  src?: string | null;
  alt?: string;
  /** Rendered width hint, e.g. "(min-width: 640px) 360px, 100vw" or "40px". */
  sizes: string;
  className?: string;
  /** Load immediately with high priority (cards in the first visible row). */
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

/**
 * Game cover rendered through Next.js image optimisation: the server fetches
 * the original once, resizes it to the size actually shown, converts it to
 * WebP and caches it. Covers are pasted links from many sites and are often
 * several megabytes, while cards are only a few hundred pixels wide.
 *
 * If the optimiser cannot handle a link (unsupported format, host blocks it),
 * the original URL is used so the cover still appears.
 */
export function CoverImage({ src, alt = "", sizes, className = "", priority = false, onLoad, onError }: CoverImageProps) {
  // Remember which src the optimiser failed on, so a new src gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const useOriginal = failedSrc === src;

  if (!src) return null;

  if (useOriginal || !REMOTE_IMAGE.test(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        onLoad={onLoad}
        onError={onError}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
      onLoad={onLoad}
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}

/**
 * Start downloading covers before their cards are shown (e.g. the next page),
 * requesting exactly the optimised size an idea card would pick, so the image
 * is already in the browser cache when the card appears.
 */
export function warmCoverImages(urls: string[], sizes: string = IDEA_CARD_SIZES) {
  if (typeof window === "undefined") return;
  for (const url of new Set(urls)) {
    if (!REMOTE_IMAGE.test(url) || warmed.has(`${sizes}|${url}`)) continue;
    warmed.add(`${sizes}|${url}`);
    const { props } = getImageProps({ src: url, alt: "", fill: true, sizes });
    const img = new window.Image();
    img.decoding = "async";
    if (props.sizes) img.sizes = props.sizes;
    if (props.srcSet) img.srcset = props.srcSet;
    img.src = props.src;
  }
}

const warmed = new Set<string>();
