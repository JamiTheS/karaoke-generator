"use client";

import { useState, useEffect, useRef } from "react";
import { LyricLine, LyricsState, LyricWord, YouTubeCaptionEvent } from "@/types";

interface CaptionSegment {
  startMs: number;
  durationMs: number;
  text: string;
}

interface APIResponse {
  videoDetails?: {
    title: string;
    lengthSeconds: number;
  };
  captions?: CaptionSegment[];
  youtubeCaptions?: {
    events?: YouTubeCaptionEvent[];
  };
  lrcMatch?: {
    artist: string;
    track: string;
  };
  error?: string;
}

function convertToLyricLines(segments: CaptionSegment[]): LyricLine[] {
  return segments.map((seg) => {
    const startTime = seg.startMs / 1000;
    const endTime = (seg.startMs + seg.durationMs) / 1000;

    const wordTexts = seg.text.split(/\s+/).filter(w => w.length > 0);
    const wordDuration = seg.durationMs / Math.max(wordTexts.length, 1);

    const words: LyricWord[] = wordTexts.map((text, i) => ({
      text,
      startTime: (seg.startMs + i * wordDuration) / 1000,
      endTime: (seg.startMs + (i + 1) * wordDuration) / 1000,
    }));

    return {
      time: startTime,
      endTime,
      text: seg.text,
      words,
    };
  });
}

export function useLyrics(
  videoId: string,
  videoDuration: number = 0,
  videoTitle?: string
): LyricsState {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(!!videoId);
  const [error, setError] = useState<string | null>(videoId ? null : "No video ID provided");
  const [lrcDuration, setLrcDuration] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [rawTitle, setRawTitle] = useState("");
  const [youtubeCaptionEvents, setYoutubeCaptionEvents] = useState<YouTubeCaptionEvent[]>([]);

  // Track if we've already successfully loaded lyrics to avoid re-fetching
  const hasLoadedRef = useRef(false);
  // Track the last fetch key to avoid redundant calls
  const lastFetchRef = useRef<string>("");

  useEffect(() => {
    if (!videoId) return;

    // Don't re-fetch if we already have lyrics
    if (hasLoadedRef.current) return;

    // Build a stable fetch key to avoid redundant calls
    const fetchKey = `${videoId}:${videoTitle || ""}:${videoDuration}`;
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    let cancelled = false;

    async function loadLyrics() {
      setIsLoading(true);
      setError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("/api/captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            searchQuery: videoTitle || undefined,
            duration: videoDuration || undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (cancelled) return;

        const data: APIResponse = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch lyrics");
          setIsLoading(false);
          return;
        }

        if (data.videoDetails?.title) {
          setRawTitle(data.videoDetails.title);
        } else if (videoTitle) {
          setRawTitle(videoTitle);
        }

        if (data.videoDetails?.lengthSeconds) {
          setTrackDuration(data.videoDetails.lengthSeconds);
        } else if (videoDuration) {
          setTrackDuration(videoDuration);
        }

        // Store YouTube caption events for auto-calibration
        if (data.youtubeCaptions?.events) {
          setYoutubeCaptionEvents(data.youtubeCaptions.events);
        }

        if (!data.captions || data.captions.length === 0) {
          setError(data.error || "No synchronized lyrics found for this song");
          setIsLoading(false);
          return;
        }

        const lyricLines = convertToLyricLines(data.captions);

        if (lyricLines.length > 0) {
          const lastLine = lyricLines[lyricLines.length - 1];
          setLrcDuration(lastLine.endTime + 5);
        }

        setLyrics(lyricLines);
        setIsLoading(false);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else {
          setError("Failed to load lyrics. Please try again.");
        }
        setIsLoading(false);
      }
    }

    loadLyrics();

    return () => {
      cancelled = true;
    };
  }, [videoId, videoTitle, videoDuration]);

  return {
    lyrics,
    isLoading,
    error,
    rawTitle,
    lrcDuration,
    trackDuration,
    youtubeCaptionEvents,
  };
}

// Parse stored LRC lyrics into LyricLine format
export function useParsedLyrics(
  syncedLyrics: string | null,
  trackDuration: number
): LyricsState {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(!!syncedLyrics);
  const [error, setError] = useState<string | null>(syncedLyrics ? null : "No synchronized lyrics provided.");
  const [lrcDuration, setLrcDuration] = useState(0);

  useEffect(() => {
    if (!syncedLyrics) return;

    const lines = syncedLyrics.split("\n");
    const parsed: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (!match) continue;

      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3].length === 2
        ? parseInt(match[3], 10) * 10
        : parseInt(match[3], 10);

      const time = minutes * 60 + seconds + ms / 1000;
      const text = line.replace(timeRegex, "").trim();

      if (text) {
        parsed.push({
          time,
          endTime: 0,
          text,
          words: [],
        });
      }
    }

    // Calculate endTime and word timing from next line's start time
    for (let i = 0; i < parsed.length; i++) {
      const nextTime = i + 1 < parsed.length ? parsed[i + 1].time : parsed[i].time + 4;
      parsed[i].endTime = nextTime;

      const wordTexts = parsed[i].text.split(/\s+/).filter(w => w.length > 0);
      const lineDuration = parsed[i].endTime - parsed[i].time;
      const wordDuration = lineDuration / Math.max(wordTexts.length, 1);

      parsed[i].words = wordTexts.map((t, j) => ({
        text: t,
        startTime: parsed[i].time + j * wordDuration,
        endTime: parsed[i].time + (j + 1) * wordDuration,
      }));
    }

    if (parsed.length === 0) {
      setError("Lyrics found but no synchronized timestamps available.");
      setIsLoading(false);
      return;
    }

    setLyrics(parsed);
    setLrcDuration(parsed[parsed.length - 1].endTime + 5);
    setError(null);
    setIsLoading(false);
  }, [syncedLyrics]);

  return {
    lyrics,
    isLoading,
    error,
    rawTitle: "",
    lrcDuration,
    trackDuration,
    youtubeCaptionEvents: [],
  };
}
