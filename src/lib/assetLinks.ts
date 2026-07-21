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
