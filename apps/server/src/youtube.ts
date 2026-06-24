import type { YouTubeSearchResult } from "@system-core/shared-types";

const INVIDIOUS_INSTANCES = [
  "https://yewtu.be",
  "https://invidious.fdn.fr",
  "https://inv.nadeko.net",
];

const INNERTUBE_CONTEXT = {
  context: {
    client: {
      clientName: "WEB",
      clientVersion: "2.20250328.01.00",
      hl: "en",
      gl: "US",
    },
  },
};

async function searchInvidious(query: string): Promise<YouTubeSearchResult[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;

      const data = (await res.json()) as Array<{
        type: string;
        videoId?: string;
        title?: string;
        author?: string;
        videoThumbnails?: Array<{ quality: string; url: string }>;
      }>;

      const results = data
        .filter((item) => item.type === "video" && item.videoId)
        .slice(0, 12)
        .map((item) => ({
          videoId: item.videoId!,
          title: item.title ?? "Unknown",
          channelTitle: item.author ?? "Unknown",
          thumbnailUrl:
            item.videoThumbnails?.find((t) => t.quality === "medium")?.url ??
            item.videoThumbnails?.[0]?.url ??
            `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
        }));

      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }

  return [];
}

async function searchInnerTube(query: string): Promise<YouTubeSearchResult[]> {
  const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...INNERTUBE_CONTEXT, query }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error("YouTube search failed");

  const data = (await res.json()) as {
    contents?: {
      twoColumnSearchResultsRenderer?: {
        primaryContents?: {
          sectionListRenderer?: {
            contents?: Array<{
              itemSectionRenderer?: {
                contents?: Array<{
                  videoRenderer?: {
                    videoId: string;
                    title?: { runs?: Array<{ text: string }> };
                    ownerText?: { runs?: Array<{ text: string }> };
                    thumbnail?: { thumbnails?: Array<{ url: string }> };
                  };
                }>;
              };
            }>;
          };
        };
      };
    };
  };

  const sections =
    data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
      ?.contents ?? [];

  const results: YouTubeSearchResult[] = [];

  for (const section of sections) {
    const items = section.itemSectionRenderer?.contents ?? [];
    for (const item of items) {
      const video = item.videoRenderer;
      if (!video?.videoId) continue;

      results.push({
        videoId: video.videoId,
        title: video.title?.runs?.[0]?.text ?? "Unknown",
        channelTitle: video.ownerText?.runs?.[0]?.text ?? "Unknown",
        thumbnailUrl:
          video.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
          `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
      });

      if (results.length >= 12) return results;
    }
  }

  return results;
}

async function searchYouTubeApi(query: string, apiKey: string): Promise<YouTubeSearchResult[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error("YouTube API search failed");

  const data = (await res.json()) as {
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { medium?: { url: string }; default?: { url: string } };
      };
    }>;
  };

  return data.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl:
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      `https://i.ytimg.com/vi/${item.id.videoId}/mqdefault.jpg`,
  }));
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const results = await searchYouTubeApi(trimmed, apiKey);
      if (results.length > 0) return results;
    } catch {
      // fall through
    }
  }

  const invidious = await searchInvidious(trimmed);
  if (invidious.length > 0) return invidious;

  const innerTube = await searchInnerTube(trimmed);
  if (innerTube.length > 0) return innerTube;

  throw new Error("YouTube search unavailable. Try again later.");
}

export function parseYouTubeUrl(input: string): string | null {
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveYouTubeVideo(input: string): Promise<YouTubeSearchResult | null> {
  const videoId = parseYouTubeUrl(input);
  if (!videoId) return null;

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title: string; author_name: string; thumbnail_url: string };
    return {
      videoId,
      title: data.title,
      channelTitle: data.author_name,
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return {
      videoId,
      title: "YouTube video",
      channelTitle: "Unknown",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    };
  }
}
