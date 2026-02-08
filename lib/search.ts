import { LrcSearchResult } from "@/types";

export interface SearchResult {
  videoId: string;
  title: string;
}

/**
 * Search YouTube videos via our own API route (server-side scraping).
 * This avoids CORS issues and doesn't depend on third-party Invidious instances.
 */
export async function searchYouTube(
  query: string
): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `/api/youtube-search?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(12000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Search LRClib for songs with synced lyrics available.
 * Returns only results that have syncedLyrics.
 */
export async function searchLrclib(
  query: string
): Promise<LrcSearchResult[]> {
  try {
    const response = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];

    const results = await response.json();
    if (!Array.isArray(results)) return [];

    return results
      .filter(
        (r: { syncedLyrics: string | null }) =>
          r.syncedLyrics && r.syncedLyrics.length > 0
      )
      .map(
        (r: {
          id: number;
          trackName: string;
          artistName: string;
          albumName: string;
          duration: number;
          syncedLyrics: string;
        }) => ({
          id: r.id,
          trackName: r.trackName || "Unknown",
          artistName: r.artistName || "Unknown",
          albumName: r.albumName || "",
          duration: r.duration || 0,
          syncedLyrics: r.syncedLyrics,
        })
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Find a YouTube video matching an artist + track name.
 * Searches YouTube directly via our server-side API route.
 */
export async function findYouTubeVideo(
  artistName: string,
  trackName: string
): Promise<SearchResult | null> {
  // Search with artist + track name
  const results = await searchYouTube(`${artistName} ${trackName}`);
  if (results.length > 0) return results[0];

  // Fallback: try with just the track name
  const fallback = await searchYouTube(trackName);
  return fallback.length > 0 ? fallback[0] : null;
}
