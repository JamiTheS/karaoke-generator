import { LyricLine, LyricWord } from "@/types";

export interface CaptionSegment {
  startMs: number;
  durationMs: number;
  text: string;
}

/**
 * Fetch auto-generated captions from YouTube using the Innertube API.
 * Returns timed caption segments that can be used for sync calibration.
 * No API key needed.
 */
export async function fetchYouTubeCaptions(
  videoId: string,
  lang: string = "en"
): Promise<CaptionSegment[]> {
  try {
    const response = await fetch("/api/captions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
      signal: AbortSignal.timeout(15000), // Give it a bit more time
    });

    if (!response.ok) return [];

    const captionData = await response.json();
    const events = captionData?.events;

    if (!Array.isArray(events)) return [];

    // Parse events into segments
    return events
      .filter(
        (e: { segs?: { utf8: string }[] }) =>
          e.segs && e.segs.length > 0
      )
      .map(
        (e: {
          tStartMs: number;
          dDurationMs: number;
          segs: { utf8: string }[];
        }) => ({
          startMs: e.tStartMs || 0,
          durationMs: e.dDurationMs || 0,
          text: e.segs
            .map((s: { utf8: string }) => s.utf8)
            .join("")
            .trim(),
        })
      )
      .filter((s: CaptionSegment) => s.text.length > 0 && s.text !== "\n");
  } catch {
    return [];
  }
}

/**
 * Use YouTube captions to find when singing actually starts in the video.
 * Returns the timestamp (in seconds) of the first non-empty caption,
 * which represents when vocals begin.
 */
export function findFirstVocalTimestamp(
  captions: CaptionSegment[]
): number | null {
  if (captions.length === 0) return null;

  // Skip very short or common non-lyric captions at the start
  // (like "[Music]", "[Applause]", etc.)
  for (const caption of captions) {
    const text = caption.text.toLowerCase().trim();
    if (
      text.startsWith("[") ||
      text.startsWith("(") ||
      text === "music" ||
      text === "applause" ||
      text.length < 2
    ) {
      continue;
    }
    return caption.startMs / 1000;
  }

  return captions[0].startMs / 1000;
}

/**
 * Converts raw YouTube caption segments into the application's LyricLine format.
 * Since captions don't have word-level timestamps, we interpolate word timing evenly.
 */
export function convertCaptionsToLyrics(captions: CaptionSegment[]): LyricLine[] {
  return captions.map((cap) => {
    const startTime = cap.startMs / 1000;
    const duration = cap.durationMs / 1000;
    const endTime = startTime + duration;
    // Clean text (sometimes captions have newlines or double spaces)
    const text = cap.text.replace(/\s+/g, " ").trim();

    // Naive word splitting and timing
    const words = text.split(" ").filter((w) => w.length > 0);
    const wordDuration = words.length > 0 ? duration / words.length : 0;

    const lyricWords: LyricWord[] = words.map((word, index) => ({
      text: word + (index < words.length - 1 ? " " : ""), // Add space to word for display
      startTime: startTime + index * wordDuration,
      endTime: startTime + (index + 1) * wordDuration,
    }));

    return {
      time: startTime,
      text,
      endTime,
      words: lyricWords,
    };
  });
}
