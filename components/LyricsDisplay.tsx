"use client";

import { LyricLine } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

interface LyricsDisplayProps {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  isLoading: boolean;
  error: string | null;
}

export default function LyricsDisplay({
  currentLine,
  nextLine,
  isLoading,
  error,
}: LyricsDisplayProps) {

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="space-y-4 w-full max-w-3xl">
          <div className="h-16 bg-white/5 rounded-2xl animate-pulse w-3/4 mx-auto" />
          <div className="h-8 bg-white/5 rounded-2xl animate-pulse w-1/2 mx-auto" />
        </div>
        <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Loading lyrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-3xl font-bold mb-4 text-white/90">No lyrics available</p>
        <p className="text-white/40 text-lg max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-hidden min-h-[50vh] sm:min-h-[60vh] font-sans selection:bg-purple-500/30">
      <div className="relative w-full max-w-6xl flex flex-col items-center justify-center h-[200px] sm:h-[300px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {currentLine && (
            <motion.div
              key={currentLine.time}
              layoutId={currentLine.time.toString()}
              initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(5px)" }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                color: "#c4b5fd",
                textShadow: "0 0 40px rgba(167, 139, 250, 0.5)"
              }}
              exit={{
                opacity: 0,
                y: -60,
                scale: 1.1,
                filter: "blur(12px)",
                transition: { duration: 0.4, ease: "easeIn" }
              }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 25,
                mass: 1
              }}
              className="absolute w-full flex items-center justify-center z-20 origin-center"
            >
              <h1 className="text-center text-3xl sm:text-5xl md:text-7xl font-extrabold leading-tight tracking-tight px-2">
                {currentLine.text}
              </h1>
            </motion.div>
          )}

          {nextLine && (
            <motion.div
              key={nextLine.time}
              layoutId={nextLine.time.toString()}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: 0.4,
                y: 80, // Reduced from 100 for mobile
                scale: 0.8,
                filter: "blur(2px)",
                color: "#94a3b8",
                textShadow: "none"
              }}
              exit={{ opacity: 0 }} // Should update to become current, handled by key change matching
              transition={{ duration: 0.5 }}
              className="absolute w-full flex items-center justify-center z-10 origin-top"
            >
              <p className="text-center text-xl sm:text-3xl md:text-4xl font-semibold px-4">
                {nextLine.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
