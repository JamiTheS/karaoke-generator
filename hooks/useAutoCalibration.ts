"use client";

import { useMemo, useState, useEffect } from "react";
import { LyricLine } from "@/types";
import {
  fetchYouTubeCaptions,
  findFirstVocalTimestamp,
  CaptionSegment,
} from "@/lib/captions";

/**
 * Auto-calibrate lyrics offset using a two-layer approach:
 *
 * Layer 1 (primary): YouTube captions anchoring
 * - Fetch auto-generated captions from YouTube
 * - Find when the first vocal line starts in the video
 * - Compare with the first LRC lyric timestamp
 * - The difference is the exact offset
 *
 * Layer 2 (fallback): Duration comparison
 * - Compare LRClib trackDuration with YouTube videoDuration
 * - The difference is mostly intro footage
 */
export function useAutoCalibration(
  lyrics: LyricLine[],
  trackDuration: number,
  videoDuration: number,
  videoId: string,
  manualOffsetMs: number
): { totalOffsetMs: number; autoOffsetMs: number; isCalibrated: boolean } {
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [captionsFetched, setCaptionsFetched] = useState(false);

  // Fetch YouTube captions once we have a videoId
  useEffect(() => {
    if (!videoId || captionsFetched) return;

    fetchYouTubeCaptions(videoId).then((caps) => {
      setCaptions(caps);
      setCaptionsFetched(true);
    });
  }, [videoId, captionsFetched]);

  const { autoOffsetMs, isCalibrated } = useMemo(() => {
    if (lyrics.length === 0 || videoDuration <= 0) {
      return { autoOffsetMs: 0, isCalibrated: false };
    }

    // Layer 1: Caption-based anchoring
    if (captions.length > 0) {
      const firstVocalInVideo = findFirstVocalTimestamp(captions);
      const firstLyricTime = lyrics[0].time;

      if (firstVocalInVideo !== null && firstLyricTime >= 0) {
        // The offset is how much later the vocal starts in the video
        // vs when the LRC says it should start.
        // Negative offset = lyrics need to appear later
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
  }, [lyrics, trackDuration, videoDuration, captions]);

  return {
    totalOffsetMs: autoOffsetMs + manualOffsetMs,
    autoOffsetMs,
    isCalibrated,
  };
}
