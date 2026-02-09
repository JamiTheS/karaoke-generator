import { VideoMetadata } from "@/types";

const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export function parseYouTubeTitle(rawTitle: string): VideoMetadata {
  // Common patterns: "Artist - Song Title", "Artist - Song Title (Official Video)"
  // Remove common suffixes
  const cleaned = rawTitle
    .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, "")
    .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, "")
    .replace(/\s*\(Official\s*Audio\)/gi, "")
    .replace(/\s*\[Official\s*Audio\]/gi, "")
    .replace(/\s*\(Lyrics?\)/gi, "")
    .replace(/\s*\[Lyrics?\]/gi, "")
    .replace(/\s*\(Lyric\s*Video\)/gi, "")
    .replace(/\s*\[Lyric\s*Video\]/gi, "")
    .replace(/\s*\(Audio\)/gi, "")
    .replace(/\s*\[Audio\]/gi, "")
    .replace(/\s*\(HD\)/gi, "")
    .replace(/\s*\(HQ\)/gi, "")
    .replace(/\s*\(4K\s*Remaster\)/gi, "")
    .replace(/\s*\(Clip\s*Officiel\)/gi, "")  // French
    .replace(/\s*\(Clip\s*Video\)/gi, "")      // French
    .replace(/\s*\(Video\s*Clip\)/gi, "")      // French
    .replace(/\s*ft\.?\s*.+$/gi, "")
    .replace(/\s*feat\.?\s*.+$/gi, "")
    .trim();

  // Try "Artist - Title" pattern
  const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      title: rawTitle,
      artist: dashMatch[1].trim(),
      trackName: dashMatch[2].trim(),
    };
  }

  // If no dash separator, use the whole thing as title
  return {
    title: rawTitle,
    artist: "",
    trackName: cleaned,
  };
}

export function getThumbnailUrl(
  videoId: string,
  quality: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault" = "hqdefault"
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
