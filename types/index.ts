export interface LyricLine {
  time: number;
  text: string;
  endTime: number;
  words: LyricWord[];
}

export interface LyricWord {
  text: string;
  startTime: number;
  endTime: number;
}

export interface VideoMetadata {
  title: string;
  artist: string;
  trackName: string;
}

export interface GradientColors {
  primary: string;
  secondary: string;
}

export interface LyricsState {
  lyrics: LyricLine[];
  isLoading: boolean;
  error: string | null;
  rawTitle: string;
  /** Duration of the last lyric line end (computed from LRC timestamps) */
  lrcDuration: number;
  /** Official track duration from LRClib metadata (the source of truth) */
  trackDuration: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface LyricsSyncResult {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  currentLineIndex: number;
  currentTime: number;
  wordProgress: number;
  activeWordIndex: number;
  syncedTime: number;
}

/** A search result from LRClib representing a song with synced lyrics */
export interface LrcSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  syncedLyrics: string;
}
