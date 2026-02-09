"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Timer } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  syncOffsetMs: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onSyncOffsetChange: (offsetMs: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  syncOffsetMs,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onSyncOffsetChange,
}: PlayerControlsProps) {
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  // Format offset for display
  const formatOffset = (ms: number) => {
    const sign = ms >= 0 ? "+" : "";
    const seconds = (ms / 1000).toFixed(1);
    return `${sign}${seconds}s`;
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex flex-col items-center px-4 gap-3">
      {/* Sync Slider Panel */}
      <AnimatePresence>
        {showSyncPanel && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-2xl bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/70">Synchronisation des paroles</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSyncOffsetChange(0)}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Réinitialiser
                </motion.button>
              </div>

              {/* Slider Container */}
              <div className="relative px-2">
                {/* Labels */}
                <div className="flex justify-between text-xs text-white/40 mb-2">
                  <span>← Plus tôt</span>
                  <span className="text-violet-400 font-mono font-medium">{formatOffset(syncOffsetMs)}</span>
                  <span>Plus tard →</span>
                </div>

                {/* Custom Slider Track */}
                <div className="relative h-10 flex items-center">
                  {/* Track Background */}
                  <div className="absolute inset-x-0 h-2 bg-white/10 rounded-full overflow-hidden">
                    {/* Center Glow Marker */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-violet-500 shadow-[0_0_10px_2px_rgba(139,92,246,0.5)]" />
                  </div>

                  {/* Slider Input */}
                  <input
                    type="range"
                    min={-5000}
                    max={5000}
                    step={100}
                    value={syncOffsetMs}
                    onChange={(e) => onSyncOffsetChange(parseInt(e.target.value))}
                    className="absolute inset-x-0 w-full h-10 opacity-0 cursor-pointer z-10"
                  />

                  {/* Custom Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg shadow-violet-500/30 pointer-events-none transition-all"
                    style={{
                      left: `calc(${((syncOffsetMs + 5000) / 10000) * 100}% - 10px)`,
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 opacity-50" />
                  </div>
                </div>

                {/* Tick Marks */}
                <div className="flex justify-between text-[10px] text-white/30 mt-1 px-1">
                  <span>-5s</span>
                  <span>-2.5s</span>
                  <span className="text-violet-400">0</span>
                  <span>+2.5s</span>
                  <span>+5s</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Player Controls */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl"
      >
        <div className="flex flex-col gap-4">
          {/* Progress Bar */}
          <div className="group relative h-2 w-full cursor-pointer touch-none" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            onSeek(pos * duration);
          }}>
            {/* Background Track */}
            <div className="absolute inset-0 rounded-full bg-white/10 overflow-hidden">
              {/* Filled Track */}
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                layoutId="progress"
              />
            </div>

            {/* Hover Handle/Knob (Only visible on group hover) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform scale-0 group-hover:scale-100"
              style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: "-8px" }}
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Time Info */}
            <span className="text-xs font-mono text-white/50 w-12">{formatTime(currentTime)}</span>

            {/* Main Controls */}
            <div className="flex items-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                className="text-white/70 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5 fill-current opacity-50" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onTogglePlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:bg-violet-100 transition-colors shadow-lg shadow-violet-500/20"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Skip forward"
              >
                <SkipForward className="w-5 h-5 fill-current opacity-50" />
              </motion.button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 w-20 justify-end">
              {/* Sync Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSyncPanel(!showSyncPanel)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showSyncPanel
                    ? "text-violet-400 bg-violet-500/20"
                    : "text-white/50 hover:text-white"
                  }`}
                aria-label="Sync lyrics"
              >
                <Timer className="w-4 h-4" />
              </motion.button>

              {/* Volume Control (Mini) */}
              <div className="group relative flex items-center">
                <button
                  onClick={() => onVolumeChange(volume === 0 ? 80 : 0)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Volume Slider Pop-up */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div className="h-24 w-6 flex items-center justify-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                      className="-rotate-90 w-20 h-2 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
