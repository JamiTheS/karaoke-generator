"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, Minus, Plus, Timer, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useLyrics, useParsedLyrics } from "@/hooks/useLyrics";
import { useLyricsSync } from "@/hooks/useLyricsSync";
import { useAutoCalibration } from "@/hooks/useAutoCalibration";
import { getSelectedSong } from "@/lib/song-store";
import BackgroundGradient from "./BackgroundGradient";
import LyricsDisplay from "./LyricsDisplay";
import PlayerControls from "./PlayerControls";

const YouTube = dynamic(() => import("react-youtube"), { ssr: false });

interface KaraokePlayerProps {
  videoId: string;
}

export default function KaraokePlayer({ videoId }: KaraokePlayerProps) {

  const router = useRouter();
  const [manualOffsetMs, setManualOffsetMs] = useState(0);
  const [showOffset, setShowOffset] = useState(false);
  const [playerTimeout, setPlayerTimeout] = useState(false);

  // Check if we have pre-fetched song data from the search flow
  const storedSong = useMemo(() => getSelectedSong(), []);

  const {
    isPlaying,
    duration,
    isReady,
    volume,
    title,
    error: playerError,
    onReady,
    onStateChange,
    onError,
    togglePlay,
    seek,
    getCurrentTime,
    setVolume,
  } = useYouTubePlayer();

  // Safety timeout: if player is not ready after 12s, show error
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady) setPlayerTimeout(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [isReady]);

  // Dual lyrics source: use pre-fetched lyrics if available, else fetch from API
  const lyricsFromStore = useParsedLyrics(
    storedSong?.syncedLyrics ?? null,
    storedSong?.duration ?? 0
  );

  // Use new simplified useLyrics hook - just pass videoId
  const lyricsFromAPI = useLyrics(
    storedSong ? "" : videoId, // only fetch if no stored song
    duration
  );

  const { lyrics, isLoading, error: lyricsError, trackDuration, rawTitle } = storedSong
    ? lyricsFromStore
    : lyricsFromAPI;



  // Display title: prefer stored song info, fallback to YouTube title
  const displayTitle = storedSong
    ? `${storedSong.artistName} - ${storedSong.trackName}`
    : title;

  // Combine errors: player errors take priority
  const displayError =
    playerError ||
    (playerTimeout && !isReady
      ? "Video could not be loaded. Please check the URL and try again."
      : null) ||
    lyricsError;

  const { totalOffsetMs, autoOffsetMs, isCalibrated } = useAutoCalibration(
    lyrics,
    trackDuration,
    duration,
    videoId,
    manualOffsetMs
  );

  const { currentLine, nextLine, currentTime, activeWordIndex, syncedTime } =
    useLyricsSync(lyrics, getCurrentTime, isPlaying, totalOffsetMs);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback
    }
  }, []);

  const adjustOffset = useCallback((delta: number) => {
    setManualOffsetMs((prev) => prev + delta);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, currentTime - 10));
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(Math.min(duration, currentTime + 10));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(volume + 10, 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(volume - 10, 0));
          break;
        case "[":
          e.preventDefault();
          adjustOffset(-200);
          break;
        case "]":
          e.preventDefault();
          adjustOffset(200);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    togglePlay,
    seek,
    setVolume,
    adjustOffset,
    currentTime,
    duration,
    volume,
  ]);

  // State to manage the start-up sequence
  const [isStarting, setIsStarting] = useState(true);

  // ... (previous useEffects) ...

  // Auto-start logic: Wait for both Player AND Lyrics to be ready
  useEffect(() => {
    if (isReady && !isLoading && !lyricsError && isStarting) {
      // Everything is ready, let's rock!
      // Small timeout to ensure the UI is rendered
      const t = setTimeout(() => {
        togglePlay(); // This will start the video
        setIsStarting(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isReady, isLoading, lyricsError, isStarting, togglePlay]);

  return (
    <div className="fixed inset-0 flex flex-col">
      <BackgroundGradient
        videoId={videoId}
        currentLineIndex={useLyricsSync(lyrics, getCurrentTime, isPlaying, totalOffsetMs).currentLineIndex}
        isPlaying={isPlaying}
      />

      {/* Hidden YouTube Player - Autoplay DISABLED */}
      <div className="absolute -top-[9999px] -left-[9999px]">
        <YouTube
          videoId={videoId}
          opts={{
            height: "1",
            width: "1",
            playerVars: {
              autoplay: 0, // IMPORTANT: We control the start manually
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onError}
        />
      </div>

      {/* Full screen loading overlay if starting */}
      <AnimatePresence>
        {(isLoading || !isReady) && isStarting && !displayError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="w-6 h-6 text-white/50" />
              </div>
            </div>
            <p className="mt-6 text-white text-lg font-medium animate-pulse">
              Syncing lyrics & audio...
            </p>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
          aria-label="Go back to home"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </motion.button>

        {/* Song info + offset controls */}
        <div className="flex items-center gap-3">
          {displayTitle && (
            <p className="text-white/50 text-sm truncate max-w-[200px] md:max-w-md hidden md:block">
              {displayTitle}
            </p>
          )}

          {/* Offset toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowOffset((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-sm cursor-pointer transition-colors ${showOffset ? "text-accent" : "text-white/70 hover:text-white"
              }`}
            aria-label="Adjust lyrics timing"
            title="Adjust lyrics timing (keyboard: [ and ])"
          >
            <Timer className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isCalibrated && autoOffsetMs !== 0 ? "Auto" : "Sync"}
              {manualOffsetMs !== 0 &&
                ` ${manualOffsetMs > 0 ? "+" : ""}${manualOffsetMs}ms`}
            </span>
          </motion.button>

          {/* Offset controls (shown when toggled) */}
          {showOffset && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => adjustOffset(-200)}
                className="p-1.5 rounded-lg glass text-white/70 hover:text-white cursor-pointer"
                aria-label="Lyrics earlier by 200ms"
              >
                <Minus className="w-3.5 h-3.5" />
              </motion.button>

              <span className="text-xs text-white/60 w-20 text-center font-mono">
                {totalOffsetMs > 0 ? "+" : ""}
                {totalOffsetMs}ms
              </span>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => adjustOffset(200)}
                className="p-1.5 rounded-lg glass text-white/70 hover:text-white cursor-pointer"
                aria-label="Lyrics later by 200ms"
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setManualOffsetMs(0)}
                className="px-2 py-1 rounded-lg text-xs text-white/50 hover:text-white cursor-pointer"
                aria-label="Reset manual offset"
              >
                Reset
              </motion.button>
            </motion.div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-white/70 hover:text-white transition-colors text-sm cursor-pointer"
          aria-label="Share link"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </motion.button>
      </motion.header>

      {/* Lyrics Display */}
      <LyricsDisplay
        currentLine={currentLine}
        nextLine={nextLine}
        isLoading={!displayError && (!isReady || isLoading)}
        error={displayError}
      />

      {/* Player Controls */}
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onVolumeChange={setVolume}
      />
    </div>
  );
}
