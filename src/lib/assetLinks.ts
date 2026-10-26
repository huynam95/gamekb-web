export type AssetLink = {
  url: string;
  name: string;
};

export type AssetDuplicateMeta = {
  total: number;
  position: number;
  isPrimary: boolean;
};

function getYouTubeVideoId(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId;

      const pathMatch = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/i);
      return pathMatch?.[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getAssetIdentity(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) return null;

  const youtubeId = getYouTubeVideoId(value);
  if (youtubeId) return `youtube:${youtubeId.toLowerCase()}`;

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    url.hash = "";

    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "feature", "si"].forEach((key) => {
      url.searchParams.delete(key);
    });
    url.searchParams.sort();

    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.hostname.toLowerCase()}${pathname}${url.search}`;
  } catch {
    return value.toLowerCase();
  }
}

/** Start time of a link in seconds (?t=228, ?t=3m48s, &start=228, #t=228), or 0. */
function getStartSeconds(rawUrl: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`);
    const raw = url.searchParams.get("t") || url.searchParams.get("start") || new URLSearchParams(url.hash.replace(/^#/, "")).get("t") || "";
    if (!raw) return 0;
    if (/^\d+$/.test(raw)) return Number(raw);
    const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
    return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Identity of a clip: the source video plus where it starts. Two moments of the
 * same YouTube video are two clips (but one download, see getAssetIdentity).
 */
export function getClipIdentity(rawUrl: string) {
  const source = getAssetIdentity(rawUrl);
  if (!source) return null;
  return source.startsWith("youtube:") ? `${source}@${getStartSeconds(rawUrl)}` : source;
}

/** Count distinct clips and distinct source videos across any number of link lists. */
export function countClips(urls: (string | null | undefined)[]) {
  const clips = new Set<string>();
  const sources = new Set<string>();
  for (const url of urls) {
    if (!url?.trim()) continue;
    const clip = getClipIdentity(url);
    const source = getAssetIdentity(url);
    if (clip) clips.add(clip);
    if (source) sources.add(source);
  }
  return { clips: clips.size, sources: sources.size };
}

export function analyzeAssetLinks<T extends AssetLink>(assets: T[]) {
  const groupedIndexes = new Map<string, number[]>();

  assets.forEach((asset, index) => {
    const identity = getAssetIdentity(asset.url);
    if (!identity) return;
    const indexes = groupedIndexes.get(identity) || [];
    indexes.push(index);
    groupedIndexes.set(identity, indexes);
  });

  const duplicateMeta = new Map<number, AssetDuplicateMeta>();
  let duplicateVideoCount = 0;
  let repeatedLinkCount = 0;

  groupedIndexes.forEach((indexes) => {
    if (indexes.length < 2) return;
    duplicateVideoCount += 1;
    repeatedLinkCount += indexes.length - 1;

    indexes.forEach((assetIndex, position) => {
      duplicateMeta.set(assetIndex, {
        total: indexes.length,
        position: position + 1,
        isPrimary: position === 0,
      });
    });
  });

  const seen = new Set<string>();
  const uniqueAssets = assets.filter((asset) => {
    const identity = getAssetIdentity(asset.url);
    if (!identity) return true;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });

  // Number only the first occurrence of each source. Duplicate rows deliberately
  // receive no number, so the visible order becomes 1 · duplicate · 2.
  const uniqueOrdinalByIndex = new Map<number, number>();
  const numberedIdentities = new Set<string>();
  let nextOrdinal = 1;

  assets.forEach((asset, index) => {
    const identity = getAssetIdentity(asset.url);
    if (!identity) {
      uniqueOrdinalByIndex.set(index, nextOrdinal++);
      return;
    }
    if (numberedIdentities.has(identity)) return;
    numberedIdentities.add(identity);
    uniqueOrdinalByIndex.set(index, nextOrdinal++);
  });

  return {
    duplicateMeta,
    duplicateVideoCount,
    repeatedLinkCount,
    uniqueAssets,
    uniqueOrdinalByIndex,
    uniqueLinkCount: uniqueAssets.filter((asset) => asset.url.trim()).length,
  };
}
