export type YoutubeMetadata = {
  title: string | null;
  channelName: string | null;
};

export function isYoutubeUrl(url: string): boolean {
  const trimmedUrl = url.trim();
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/i.test(trimmedUrl);
}

export async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  try {
    const trimmedUrl = url.trim();
    if (!isYoutubeUrl(trimmedUrl)) return { title: null, channelName: null };

    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(trimmedUrl)}`);
    if (!res.ok) return { title: null, channelName: null };

    const data = await res.json();
    return {
      title: typeof data.title === "string" ? data.title : null,
      channelName: typeof data.author_name === "string" ? data.author_name : null,
    };
  } catch {
    return { title: null, channelName: null };
  }
}

export async function fetchYoutubeTitle(url: string): Promise<string | null> {
  const metadata = await fetchYoutubeMetadata(url);
  return metadata.title;
}
