"use client";

import { useEffect, useState } from "react";

type CoverBackdropProps = {
  src?: string | null;
  alt?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
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
  loading = "lazy",
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
      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200 ${loaded ? imageClassName : "opacity-0"}`}
        />
      )}
    </div>
  );
}
