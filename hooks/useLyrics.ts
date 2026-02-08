"use client";

import { useState, useEffect } from "react";
import { LyricLine, LyricsState, LyricWord } from "@/types";

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
  lrcMatch?: {
    artist: string;
    track: string;
  };
  error?: string;
}

// Convert API caption segments to LyricLine format
function convertToLyricLines(segments: CaptionSegment[]): LyricLine[] {
  return segments.map((seg) => {
    const startTime = seg.startMs / 1000;
    const endTime = (seg.startMs + seg.durationMs) / 1000;

    // Split text into words for word-by-word highlighting
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
  videoDuration: number = 0
): LyricsState {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lrcDuration, setLrcDuration] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [rawTitle, setRawTitle] = useState("");

  useEffect(() => {
    if (!videoId) {
      setIsLoading(false);
      setError("No video ID provided");
      return;
    }

    let cancelled = false;

    async function loadLyrics() {

      setIsLoading(true);
      setError(null);
      setLyrics([]);

      try {
        const response = await fetch("/api/captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });

        if (cancelled) return;

        const data: APIResponse = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to fetch lyrics");
          setIsLoading(false);
          return;
        }

        // Set video title
        if (data.videoDetails?.title) {
          setRawTitle(data.videoDetails.title);
        }

        // Set duration
        if (data.videoDetails?.lengthSeconds) {
          setTrackDuration(data.videoDetails.lengthSeconds);
        }

        // Check for captions
        if (!data.captions || data.captions.length === 0) {
          setError(data.error || "No synchronized lyrics found for this song");
          setIsLoading(false);
          return;
        }

        // Convert to LyricLine format
        const lyricLines = convertToLyricLines(data.captions);



        // Calculate LRC duration from last segment
        if (lyricLines.length > 0) {
          const lastLine = lyricLines[lyricLines.length - 1];
          setLrcDuration(lastLine.endTime + 5); // Add 5 seconds buffer
        }

        setLyrics(lyricLines);
        setIsLoading(false);

      } catch (err) {
        if (cancelled) return;
        console.error("[useLyrics] Error:", err);
        setError("Failed to load lyrics. Please try again.");
        setIsLoading(false);
      }
    }

    loadLyrics();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return {
    lyrics,
    isLoading,
    error,
    rawTitle,
    lrcDuration,
    trackDuration,
  };
}

// Keep useParsedLyrics for backward compatibility with stored songs
export function useParsedLyrics(
  syncedLyrics: string | null,
  trackDuration: number
): LyricsState {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lrcDuration, setLrcDuration] = useState(0);

  useEffect(() => {
    if (!syncedLyrics) {
      setIsLoading(false);
      setError("No synchronized lyrics provided.");
      return;
    }

    // Parse LRC format
    const lines = syncedLyrics.split("\n");
    const parsed: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = match[3].length === 2
          ? parseInt(match[3], 10) * 10
          : parseInt(match[3], 10);

        const time = minutes * 60 + seconds + ms / 1000;
        const text = line.replace(timeRegex, "").trim();

        if (text) {
          const wordTexts = text.split(/\s+/).filter(w => w.length > 0);
          const wordDuration = 0.3; // Approximate word duration

          const words: LyricWord[] = wordTexts.map((t, j) => ({
            text: t,
            startTime: time + j * wordDuration,
            endTime: time + (j + 1) * wordDuration,
          }));

          // Calculate endTime from next line or estimate
          let endTime = time + text.length * 0.1; // Rough estimate

          parsed.push({
            time,
            endTime,
            text,
            words,
          });
        }
      }
    }

    // Update endTime based on next line's startTime
    for (let i = 0; i < parsed.length - 1; i++) {
      parsed[i].endTime = parsed[i + 1].time;
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
  };
}
