"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2,
  Search,
  Loader2,
  Music,
  Clock,
  X,
} from "lucide-react";
import { useSongSearch } from "@/hooks/useSongSearch";
import { setSelectedSong } from "@/lib/song-store";
import { LrcSearchResult } from "@/types";

const EXAMPLE_QUERIES = [
  "Despacito",
  "Bohemian Rhapsody",
  "Shape of You",
  "Faded Alan Walker",
  "Blinding Lights",
  "Someone Like You",
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LandingHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showResults, setShowResults] = useState(false);

  const {
    query,
    error,
    search,
    directUrlMatch,
  } = useSongSearch();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      search(e.target.value);
      setShowResults(true);
    },
    [search]
  );

  const handleClear = useCallback(() => {
    search("");
    setShowResults(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [search]);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = (directUrlMatch || error) && showResults;

  return (
    <div className="min-h-screen landing-gradient flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-2">
            <Music className="w-8 h-8 text-primary" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4">
          Instant Karaoke
        </h1>
        <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-md mx-auto">
          Paste a YouTube link to start singing instantly with synchronized lyrics
        </p>

        {/* Search Input */}
        <div className="relative mb-4">
          <div
            className={`flex items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-200 glass focus-within:ring-1 focus-within:ring-primary/50 ${showDropdown ? "rounded-b-none" : ""
              }`}
          >
            <Search className="w-5 h-5 text-white/40 shrink-0" />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => (directUrlMatch || error) && setShowResults(true)}
              placeholder="Paste a YouTube URL here..."
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/30 text-base sm:text-lg"
              aria-label="YouTube URL input"
              autoFocus
            />
            {query.length > 0 && (
              <button
                onClick={handleClear}
                className="p-1 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={resultsRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-40 left-0 right-0 rounded-b-2xl glass border-t border-white/10 search-dropdown overflow-hidden"
              >
                {directUrlMatch ? (
                  <button
                    onClick={() => {
                      console.log("Navigating to:", `/karaoke/${directUrlMatch}`);
                      router.push(`/karaoke/${directUrlMatch}`);
                    }}
                    className="w-full text-left px-5 py-3.5 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 group-hover:bg-red-500/30 transition-colors">
                      <Music className="w-5 h-5 text-red-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        YouTube Video Detected
                      </p>
                      <p className="text-white/50 text-sm truncate">
                        Click to generate karaoke
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="px-5 py-4 text-center">
                    <p className="text-red-400 text-sm">
                      {error || "Please enter a valid YouTube URL"}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
