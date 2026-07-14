export function getYoutubeVideoId(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "music.youtube.com") {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0]) && parts[1]) return parts[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeMediaLink(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) return "";

  const youtubeId = getYoutubeVideoId(value);
  if (youtubeId) return `youtube:${youtubeId.toLowerCase()}`;

  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    const search = new URLSearchParams(params).toString();
    return `${url.protocol}//${url.hostname}${normalizedPath}${search ? `?${search}` : ""}`.toLowerCase();
  } catch {
    return value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  }
}
