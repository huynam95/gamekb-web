import { getYoutubeVideoId } from "@/lib/mediaLinks";

export type YoutubeStats = { views: number | null; likes: number | null; comments: number | null };

/** Fetch view/like/comment counts for up to 50 YouTube video ids per request (YouTube Data API v3). */
export async function fetchYoutubeStats(videoIds: string[], apiKey: string): Promise<Map<string, YoutubeStats>> {
  const result = new Map<string, YoutubeStats>();
  const unique = Array.from(new Set(videoIds.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.map(encodeURIComponent).join(",")}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "YouTube API request failed");
    for (const item of payload.items ?? []) {
      const stats = item.statistics ?? {};
      const toNumber = (value: unknown) => (value == null ? null : Number(value));
      result.set(item.id, { views: toNumber(stats.viewCount), likes: toNumber(stats.likeCount), comments: toNumber(stats.commentCount) });
    }
  }
  return result;
}

export function youtubeIdFromUrl(url: string | null | undefined) {
  return url ? getYoutubeVideoId(url) : null;
}
