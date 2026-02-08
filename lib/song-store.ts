import { LrcSearchResult } from "@/types";

/** Ephemeral client-side store for passing selected song data between pages */
let storedSong: LrcSearchResult | null = null;

export function setSelectedSong(song: LrcSearchResult) {
  storedSong = song;
}

export function getSelectedSong(): LrcSearchResult | null {
  return storedSong;
}

export function clearSelectedSong() {
  storedSong = null;
}
