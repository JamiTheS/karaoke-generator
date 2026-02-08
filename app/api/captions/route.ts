import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

interface CaptionSegment {
    startMs: number;
    durationMs: number;
    text: string;
}

interface LRClibResult {
    syncedLyrics: string | null;
    duration: number;
    trackName: string;
    artistName: string;
}

// Parse YouTube title into artist and track name
function parseYouTubeTitle(title: string): { artist: string; trackName: string } {
    // Remove common suffixes
    let cleanTitle = title
        .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, "")
        .replace(/\s*\(Official\s*Audio\)/gi, "")
        .replace(/\s*\(Lyric\s*Video\)/gi, "")
        .replace(/\s*\(Lyrics\)/gi, "")
        .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, "")
        .replace(/\s*\(4K\s*Remaster\)/gi, "")
        .replace(/\s*\(HD\)/gi, "")
        .replace(/\s*ft\.?\s+/gi, " feat. ")
        .trim();

    // Try to split by common separators
    const separators = [" - ", " – ", " — ", " | "];
    for (const sep of separators) {
        if (cleanTitle.includes(sep)) {
            const parts = cleanTitle.split(sep);
            if (parts.length >= 2) {
                return {
                    artist: parts[0].trim(),
                    trackName: parts.slice(1).join(sep).trim(),
                };
            }
        }
    }

    return { artist: "", trackName: cleanTitle };
}

// Search LRClib for synced lyrics
async function searchLRClib(query: string): Promise<LRClibResult[]> {
    try {
        const response = await fetch(
            `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
        );
        if (!response.ok) return [];

        const results = await response.json();
        if (!Array.isArray(results)) return [];

        return results
            .filter((r: { syncedLyrics: string | null }) => r.syncedLyrics && r.syncedLyrics.length > 0)
            .map((r: { syncedLyrics: string; duration: number; trackName: string; artistName: string }) => ({
                syncedLyrics: r.syncedLyrics,
                duration: r.duration || 0,
                trackName: r.trackName || "",
                artistName: r.artistName || "",
            }));
    } catch {
        return [];
    }
}

// Pick the best LRC match based on video duration
function pickBestMatch(candidates: LRClibResult[], videoDuration: number): LRClibResult | null {
    if (candidates.length === 0) return null;
    if (videoDuration <= 0) return candidates[0];

    const sorted = [...candidates].sort((a, b) => {
        const diffA = Math.abs(videoDuration - a.duration);
        const diffB = Math.abs(videoDuration - b.duration);
        return diffA - diffB;
    });

    return sorted[0];
}

// Parse LRC format lyrics into caption segments
function parseLRCToSegments(lrc: string): CaptionSegment[] {
    const lines = lrc.split("\n");
    const segments: CaptionSegment[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3].length === 2
                ? parseInt(match[3], 10) * 10
                : parseInt(match[3], 10);

            const startMs = (minutes * 60 + seconds) * 1000 + ms;
            const text = line.replace(timeRegex, "").trim();

            if (text) {
                segments.push({
                    startMs,
                    durationMs: 3000, // Default duration, will be adjusted
                    text,
                });
            }
        }
    }

    // Adjust durations based on next segment
    for (let i = 0; i < segments.length - 1; i++) {
        segments[i].durationMs = segments[i + 1].startMs - segments[i].startMs;
    }

    return segments;
}

export async function POST(req: NextRequest) {
    try {
        const { videoId, searchQuery: userQuery, duration: userDuration } = await req.json();

        let title = "";
        let lengthSeconds = 0;
        let artist = "";
        let trackName = "";
        let searchQuery = "";

        // If we have a direct query (from client-side player), use it
        if (userQuery) {
            console.log("[API] Using client-provided metadata:", { userQuery, userDuration });
            title = userQuery;
            lengthSeconds = userDuration || 0;
            const parsed = parseYouTubeTitle(title);
            artist = parsed.artist;
            trackName = parsed.trackName;
            searchQuery = artist ? `${artist} ${trackName}` : title;
        } else {
            // Fallback to server-side YTDL (might fail on Vercel)
            if (!videoId) {
                return NextResponse.json({ error: "videoId is required if no query provided" }, { status: 400 });
            }

            // Get video info using ytdl-core
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const info = await ytdl.getInfo(videoUrl);

            title = info.videoDetails.title;
            lengthSeconds = parseInt(info.videoDetails.lengthSeconds, 10);

            // Parse title for search
            const parsed = parseYouTubeTitle(title);
            artist = parsed.artist;
            trackName = parsed.trackName;
            searchQuery = artist ? `${artist} ${trackName}` : title;
        }

        // Search LRClib for lyrics



        const results = await searchLRClib(searchQuery);


        if (results.length === 0) {
            // Try searching with just track name
            if (trackName && trackName !== title) {
                const trackResults = await searchLRClib(trackName);

                results.push(...trackResults);
            }
        }

        if (results.length === 0) {
            return NextResponse.json({
                videoDetails: { title, lengthSeconds },
                captions: [],
                error: "No synchronized lyrics found for this song"
            });
        }

        // Pick the best match based on duration
        const bestMatch = pickBestMatch(results, lengthSeconds);
        if (!bestMatch || !bestMatch.syncedLyrics) {
            return NextResponse.json({
                videoDetails: { title, lengthSeconds },
                captions: [],
                error: "No synchronized lyrics found"
            });
        }



        // Parse LRC to segments
        const segments = parseLRCToSegments(bestMatch.syncedLyrics);


        return NextResponse.json({
            videoDetails: { title, lengthSeconds },
            captions: segments,
            lrcMatch: {
                artist: bestMatch.artistName,
                track: bestMatch.trackName,
            }
        });

    } catch (error) {
        console.error("[API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch video info" },
            { status: 500 }
        );
    }
}
