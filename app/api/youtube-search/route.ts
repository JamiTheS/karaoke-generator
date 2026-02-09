import { NextRequest, NextResponse } from "next/server";

interface VideoResult {
  videoId: string;
  title: string;
}

// Disable Next.js fetch caching for this route
export const dynamic = "force-dynamic";

/**
 * Server-side YouTube search via HTML scraping.
 * No API key needed. Runs on the server to avoid CORS issues.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  if (query.length > 200) {
    return NextResponse.json(
      { error: "Query too long (max 200 characters)" },
      { status: 400 }
    );
  }

  try {
    const results = await scrapeYouTubeSearch(query.trim());
    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[youtube-search] Error:", message);
    return NextResponse.json(
      { error: "YouTube search failed", detail: message },
      { status: 500 }
    );
  }
}

async function scrapeYouTubeSearch(query: string): Promise<VideoResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  // Use manual AbortController instead of AbortSignal.timeout (better Next.js compat)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`YouTube returned ${response.status}`);
    }

    const html = await response.text();

    // Extract ytInitialData JSON from the page
    const dataMatch = html.match(/var ytInitialData = (.+?);<\/script>/);
    if (!dataMatch) {
      // Fallback: extract videoIds directly with regex
      return extractVideoIdsFromHtml(html);
    }

    try {
      const data = JSON.parse(dataMatch[1]);
      return extractFromInitialData(data);
    } catch {
      return extractVideoIdsFromHtml(html);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function extractFromInitialData(data: Record<string, unknown>): VideoResult[] {
  const results: VideoResult[] = [];
  const seen = new Set<string>();

  // Navigate the nested YouTube data structure
  const contents =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any)?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents;

  if (!Array.isArray(contents)) return [];

  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents;
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const video = item?.videoRenderer;
      if (!video?.videoId || !video?.title?.runs?.[0]?.text) continue;

      const videoId = video.videoId as string;
      const title = video.title.runs[0].text as string;

      if (seen.has(videoId)) continue;
      seen.add(videoId);

      results.push({ videoId, title });

      if (results.length >= 8) return results;
    }
  }

  return results;
}

function extractVideoIdsFromHtml(html: string): VideoResult[] {
  const results: VideoResult[] = [];
  const seen = new Set<string>();

  // Match videoRenderer patterns with videoId and title
  const pattern =
    /"videoRenderer":\{"videoId":"([^"]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const videoId = match[1];
    const title = match[2];

    if (seen.has(videoId)) continue;
    seen.add(videoId);

    results.push({ videoId, title });

    if (results.length >= 8) break;
  }

  return results;
}
