"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LyricLine, LyricsSyncResult } from "@/types";

export function useLyricsSync(
  lyrics: LyricLine[],
  getCurrentTime: () => Promise<number>,
  isPlaying: boolean,
  offsetMs: number = 0
): LyricsSyncResult {
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [syncedTime, setSyncedTime] = useState(0);
  const [wordProgress, setWordProgress] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  // Time tracking for extrapolation
  const lastKnownTimeRef = useRef<number>(0);
  const lastKnownTimestampRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const driftCorrectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cache previous values to avoid unnecessary state updates
  const prevLineIndexRef = useRef(-1);
  const prevWordIndexRef = useRef(-1);

  // Update logic - only update state when values actually change
  const updateState = useCallback(
    (time: number) => {
      const adjusted = time + offsetMs / 1000;

      if (lyrics.length === 0) {
        if (prevLineIndexRef.current !== -1) {
          setCurrentLineIndex(-1);
          setActiveWordIndex(-1);
          setWordProgress(0);
          prevLineIndexRef.current = -1;
          prevWordIndexRef.current = -1;
        }
        return;
      }

      // Find current line
      let index = -1;
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (adjusted >= lyrics[i].time) {
          index = i;
          break;
        }
      }

      // Only update line index if it changed
      if (index !== prevLineIndexRef.current) {
        setCurrentLineIndex(index);
        prevLineIndexRef.current = index;
      }

      // Word tracking - only update if it changed
      if (index >= 0) {
        const line = lyrics[index];
        const lineDuration = line.endTime - line.time;
        const elapsed = adjusted - line.time;
        const progress = lineDuration > 0
          ? Math.max(0, Math.min(1, elapsed / lineDuration))
          : 0;

        // Find active word
        let wIdx = -1;
        for (let w = line.words.length - 1; w >= 0; w--) {
          if (adjusted >= line.words[w].startTime) {
            wIdx = w;
            break;
          }
        }

        // Only update word index if it changed
        if (wIdx !== prevWordIndexRef.current) {
          setActiveWordIndex(wIdx);
          prevWordIndexRef.current = wIdx;
        }

        // Update progress only occasionally (every 100ms = 10/sec)
        setWordProgress(progress);
      } else if (prevWordIndexRef.current !== -1) {
        setWordProgress(0);
        setActiveWordIndex(-1);
        prevWordIndexRef.current = -1;
      }

      // Update time values (these are needed for display)
      setCurrentTime(time);
      setSyncedTime(adjusted);
    },
    [lyrics, offsetMs]
  );

  // Sync with YouTube source (Drift Correction)
  const syncWithPlayer = useCallback(async () => {
    try {
      const exactTime = await getCurrentTime();
      lastKnownTimeRef.current = exactTime;
      lastKnownTimestampRef.current = performance.now();
    } catch {
      // Ignore errors
    }
  }, [getCurrentTime]);

  // Main Loop - throttled to 30fps for smoother performance
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (driftCorrectionIntervalRef.current)
        clearInterval(driftCorrectionIntervalRef.current);
      return;
    }

    // Initial sync
    syncWithPlayer();

    // Drift correction every 1 second
    driftCorrectionIntervalRef.current = setInterval(syncWithPlayer, 1000);

    let lastTickTime = 0;
    const FRAME_TIME = 1000 / 30; // Target 30fps instead of 60fps

    const tick = (timestamp: number) => {
      // Throttle to ~30fps
      if (timestamp - lastTickTime >= FRAME_TIME) {
        const now = performance.now();
        const elapsedSinceLastSync = (now - lastKnownTimestampRef.current) / 1000;
        const estimatedTime = lastKnownTimeRef.current + elapsedSinceLastSync;
        updateState(estimatedTime);
        lastTickTime = timestamp;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (driftCorrectionIntervalRef.current)
        clearInterval(driftCorrectionIntervalRef.current);
    };
  }, [isPlaying, syncWithPlayer, updateState]);

  // Handle pause (update immediately)
  useEffect(() => {
    if (!isPlaying) {
      getCurrentTime().then((t) => {
        lastKnownTimeRef.current = t;
        lastKnownTimestampRef.current = performance.now();
        updateState(t);
      });
    }
  }, [isPlaying, offsetMs, getCurrentTime, updateState]);

  return {
    currentLine: currentLineIndex >= 0 ? lyrics[currentLineIndex] : null,
    nextLine:
      currentLineIndex >= 0 && currentLineIndex + 1 < lyrics.length
        ? lyrics[currentLineIndex + 1]
        : null,
    currentLineIndex,
    currentTime,
    wordProgress,
    activeWordIndex,
    syncedTime,
  };
}
