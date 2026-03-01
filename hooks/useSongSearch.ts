"use client";

import { useState, useCallback } from "react";
import { extractVideoId } from "@/lib/youtube";

interface SongSearchState {
  query: string;
  error: string | null;
  directUrlMatch: string | null;
}

export function useSongSearch() {
  const [state, setState] = useState<SongSearchState>({
    query: "",
    error: null,
    directUrlMatch: null,
  });

  const search = useCallback((query: string) => {
    if (!query.trim()) {
      setState({ query, error: null, directUrlMatch: null });
      return;
    }

    const videoId = extractVideoId(query);

    if (videoId) {
      setState({
        query,
        error: null,
        directUrlMatch: videoId,
      });
      return;
    }

    setState({
      query,
      error: query.length > 5 ? "Please enter a valid YouTube URL" : null,
      directUrlMatch: null,
    });
  }, []);

  const clear = useCallback(() => {
    setState({
      query: "",
      error: null,
      directUrlMatch: null,
    });
  }, []);

  return { ...state, search, clear };
}
