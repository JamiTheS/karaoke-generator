import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { parseYouTubeTitle } from "@/lib/youtube";

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
                    durationMs: 3000, // Default, adjusted below
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

        // Input validation
        const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
        if (videoId && !videoIdRegex.test(videoId)) {
            return NextResponse.json(
                { error: "Invalid videoId format" },
                { status: 400 }
            );
        }

        if (userQuery && (typeof userQuery !== "string" || userQuery.length > 300)) {
            return NextResponse.json(
                { error: "Invalid or too long searchQuery" },
                { status: 400 }
            );
        }

        let title = "";
        let lengthSeconds = 0;
        let artist = "";
        let trackName = "";
        let searchQuery = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let youtubeCaptions: any = null;

        // If we have a direct query (from client-side player), use it
        if (userQuery) {
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

            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const info = await ytdl.getInfo(videoUrl);

            title = info.videoDetails.title;
            lengthSeconds = parseInt(info.videoDetails.lengthSeconds, 10);

            const parsed = parseYouTubeTitle(title);
            artist = parsed.artist;
            trackName = parsed.trackName;
            searchQuery = artist ? `${artist} ${trackName}` : title;

            // Try to get YouTube captions for calibration
            try {
                const playerResponse = info.player_response;
                if (playerResponse?.captions?.playerCaptionsTracklistRenderer) {
                    const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
                    if (tracks && tracks.length > 0) {
                        const track = tracks.find((t: { languageCode: string }) => t.languageCode === 'en') || tracks[0];
                        if (track?.baseUrl) {
                            const captionResponse = await fetch(`${track.baseUrl}&fmt=json3`);
                            if (captionResponse.ok) {
                                youtubeCaptions = await captionResponse.json();
                            }
                        }
                    }
                }
            } catch {
                // YouTube captions are optional - ignore errors
            }
        }

        // Search LRClib for lyrics
        let results = await searchLRClib(searchQuery);

        if (results.length === 0 && trackName && trackName !== title) {
            const trackResults = await searchLRClib(trackName);
            results = trackResults;
        }

        if (results.length === 0) {
            return NextResponse.json({
                videoDetails: { title, lengthSeconds },
                captions: [],
                youtubeCaptions,
                error: "No synchronized lyrics found for this song",
            });
        }

        const bestMatch = pickBestMatch(results, lengthSeconds);
        if (!bestMatch?.syncedLyrics) {
            return NextResponse.json({
                videoDetails: { title, lengthSeconds },
                captions: [],
                youtubeCaptions,
                error: "No synchronized lyrics found",
            });
        }

        const segments = parseLRCToSegments(bestMatch.syncedLyrics);

        return NextResponse.json({
            videoDetails: { title, lengthSeconds },
            captions: segments,
            youtubeCaptions,
            lrcMatch: {
                artist: bestMatch.artistName,
                track: bestMatch.trackName,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to fetch video info: ${message}` },
            { status: 500 }
        );
    }
}
