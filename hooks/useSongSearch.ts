"use client";

import { useState, useCallback, useRef } from "react";
import { LrcSearchResult } from "@/types";
import { extractVideoId } from "@/lib/youtube";

interface SongSearchState {
  query: string;
  results: LrcSearchResult[];
  isSearching: boolean;
  error: string | null;
  isFindingVideo: boolean;
  directUrlMatch: string | null;
}

export function useSongSearch() {
  const [state, setState] = useState<SongSearchState>({
    query: "",
    results: [],
    isSearching: false,
    error: null,
    isFindingVideo: false,
    directUrlMatch: null,
  });

  const search = useCallback((query: string) => {
    // 1. Check if query is empty
    if (!query.trim()) {
      setState((prev) => ({ ...prev, query, error: null, directUrlMatch: null }));
      return;
    }

    // 2. Check if query is a YouTube URL
    const videoId = extractVideoId(query);

    if (videoId) {
      setState((prev) => ({
        ...prev,
        query,
        error: null,
        results: [],
        isSearching: false,
        directUrlMatch: videoId,
      }));
      return;
    }

    // 3. If not a valid URL, show error (if strictly enforcing YouTube only)
    // or just clear the match.
    // User requested: "supprime le faite de pouvoir chercher une musique"
    setState((prev) => ({
      ...prev,
      query,
      error: query.length > 5 ? "Please enter a valid YouTube URL" : null, // Only show error if they typed enough
      directUrlMatch: null
    }));

  }, []);

  const selectSong = useCallback(
    async (
      song: LrcSearchResult
    ): Promise<{ song: LrcSearchResult; videoId: string } | null> => {
      // This function is likely obsolete if we only support direct URLs, 
      // but we might keep it to avoid breaking other components if they use LrcSearchResult.
      // For now, I'll just return null or throw since we shouldn't be selecting LRCLib results anymore.
      return null;
    },
    []
  );

  const clear = useCallback(() => {
    setState({
      query: "",
      results: [],
      isSearching: false,
      error: null,
      isFindingVideo: false,
      directUrlMatch: null,
    });
  }, []);

  return { ...state, search, selectSong, clear };
}
