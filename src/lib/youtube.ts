export async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const trimmedUrl = url.trim();
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(trimmedUrl)) return null;

    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(trimmedUrl)}`);
    if (!res.ok) return null;

    const data = await res.json();
    return typeof data.title === "string" ? data.title : null;
  } catch {
    return null;
  }
}
