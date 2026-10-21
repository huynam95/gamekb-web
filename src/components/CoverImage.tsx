"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {
    setUseOriginal(false);
  }, [src]);

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
      onError={() => setUseOriginal(true)}
      className={`object-cover ${className}`}
    />
  );
}
