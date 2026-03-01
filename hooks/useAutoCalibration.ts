"use client";

import { useMemo } from "react";
import { LyricLine, YouTubeCaptionEvent } from "@/types";

interface CaptionSegment {
  startMs: number;
  text: string;
}

/**
 * Parse YouTube caption events into simple caption segments for calibration.
 */
function parseYouTubeCaptionEvents(events: YouTubeCaptionEvent[]): CaptionSegment[] {
  return events
    .filter((e) => e.segs && e.segs.length > 0)
    .map((e) => ({
      startMs: e.tStartMs || 0,
      text: e.segs!.map((s) => s.utf8).join("").trim(),
    }))
    .filter((s) => s.text.length > 0 && s.text !== "\n");
}

/**
 * Find when singing actually starts in the video by looking at captions.
 * Skips non-lyric captions like "[Music]", "[Applause]", etc.
 */
function findFirstVocalTimestamp(captions: CaptionSegment[]): number | null {
  if (captions.length === 0) return null;

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
 * Auto-calibrate lyrics offset using a two-layer approach:
 *
 * Layer 1 (primary): YouTube captions anchoring
 * - Use YouTube caption events (already fetched by useLyrics)
 * - Find when the first vocal line starts in the video
 * - Compare with the first LRC lyric timestamp
 *
 * Layer 2 (fallback): Duration comparison
 * - Compare LRClib trackDuration with YouTube videoDuration
 * - The difference is mostly intro footage
 */
export function useAutoCalibration(
  lyrics: LyricLine[],
  trackDuration: number,
  videoDuration: number,
  _videoId: string,
  manualOffsetMs: number,
  youtubeCaptionEvents: YouTubeCaptionEvent[] = []
): { totalOffsetMs: number; autoOffsetMs: number; isCalibrated: boolean } {
  const { autoOffsetMs, isCalibrated } = useMemo(() => {
    if (lyrics.length === 0 || videoDuration <= 0) {
      return { autoOffsetMs: 0, isCalibrated: false };
    }

    // Layer 1: Caption-based anchoring
    if (youtubeCaptionEvents.length > 0) {
      const captions = parseYouTubeCaptionEvents(youtubeCaptionEvents);
      const firstVocalInVideo = findFirstVocalTimestamp(captions);
      const firstLyricTime = lyrics[0].time;

      if (firstVocalInVideo !== null && firstLyricTime >= 0) {
        const offsetSeconds = firstLyricTime - firstVocalInVideo;
        const offsetMs = Math.round(offsetSeconds * 1000);
        return { autoOffsetMs: offsetMs, isCalibrated: true };
      }
    }

    // Layer 2: Duration-based fallback
    if (trackDuration > 0) {
      const diffSeconds = videoDuration - trackDuration;
      if (diffSeconds > 1) {
        const introSeconds = Math.max(0, diffSeconds - 0.5);
        return {
          autoOffsetMs: Math.round(-introSeconds * 1000),
          isCalibrated: true,
        };
      }
    }

    return { autoOffsetMs: 0, isCalibrated: true };
  }, [lyrics, trackDuration, videoDuration, youtubeCaptionEvents]);

  return {
    totalOffsetMs: autoOffsetMs + manualOffsetMs,
    autoOffsetMs,
    isCalibrated,
  };
}
