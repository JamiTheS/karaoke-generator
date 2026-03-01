"use client";

import { useState, useRef, useCallback } from "react";
import type { YouTubeEvent, YouTubePlayer } from "react-youtube";

export function useYouTubePlayer() {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target;
    const dur = event.target.getDuration();
    setDuration(dur);
    setIsReady(true);
    event.target.setVolume(80);

    // Try to get the video title from the player
    try {
      const videoData = event.target.getVideoData();
      if (videoData?.title) {
        setTitle(videoData.title);
      }
    } catch {
      // title will remain empty
    }
  }, []);

  const onStateChange = useCallback((event: YouTubeEvent) => {
    // 1 = playing, 2 = paused
    setIsPlaying(event.data === 1);
  }, []);

  const onError = useCallback((event: YouTubeEvent) => {
    const code = event.data;
    switch (code) {
      case 2:
        setError("Invalid video ID. Please check the URL and try again.");
        break;
      case 5:
        setError("This video cannot be played. Try a different video.");
        break;
      case 100:
        setError("Video not found. It may have been removed or is private.");
        break;
      case 101:
      case 150:
        setError("This video cannot be embedded. Try a different video.");
        break;
      default:
        setError("Failed to load the video. Please try again.");
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!playerRef.current) return;
    try {
      const state = await playerRef.current.getPlayerState();
      if (state === 1) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {
      // Player not ready yet
    }
  }, []);

  // Direct play - no async state check, safe for mobile user gesture chain
  const play = useCallback(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.playVideo();
      setIsPlaying(true);
    } catch {
      // Player not ready yet
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (!playerRef.current) return;
    const clampedTime = Math.max(0, time);
    playerRef.current.seekTo(clampedTime, true);
  }, []);

  const getCurrentTime = useCallback(async (): Promise<number> => {
    if (!playerRef.current) return 0;
    try {
      return await playerRef.current.getCurrentTime();
    } catch {
      return 0;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setVolumeState(clamped);
    if (playerRef.current) {
      playerRef.current.setVolume(clamped);
    }
  }, []);

  return {
    playerRef,
    isPlaying,
    duration,
    isReady,
    volume,
    title,
    error,
    onReady,
    onStateChange,
    onError,
    togglePlay,
    play,
    seek,
    getCurrentTime,
    setVolume,
  };
}
