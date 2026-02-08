"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
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
  onTogglePlay,
  onSeek,
  onVolumeChange,
}: PlayerControlsProps) {
  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
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

            {/* Volume & Duration */}
            <div className="flex items-center gap-4 w-12 justify-end">
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
