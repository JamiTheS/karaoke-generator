import { LyricLine } from "@/types";
import { distributeTimeBySyllables } from "./syllables";

interface RawLine {
  time: number;
  text: string;
}

function parseRawLines(lrcString: string): RawLine[] {
  const lines = lrcString.split("\n");

  return lines
    .filter((line) => /\[\d{2}:\d{2}[.:]\d{2,3}\]/.test(line))
    .map((line) => {
      const match = line.match(/\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
      if (!match) return null;

      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds =
        match[3].length === 3
          ? parseInt(match[3], 10) / 1000
          : parseInt(match[3], 10) / 100;

      const time = minutes * 60 + seconds + centiseconds;
      const text = match[4].trim();

      if (!text) return null;

      return { time, text };
    })
    .filter((line): line is RawLine => line !== null)
    .sort((a, b) => a.time - b.time);
}

export function parseLRC(lrcString: string): LyricLine[] {
  const rawLines = parseRawLines(lrcString);
  if (rawLines.length === 0) return [];

  return rawLines.map((line, i) => {
    const endTime =
      i + 1 < rawLines.length ? rawLines[i + 1].time : line.time + 4;

    const rawWords = line.text.split(/\s+/).filter((w) => w.length > 0);
    const words = distributeTimeBySyllables(rawWords, line.time, endTime);

    return {
      time: line.time,
      text: line.text,
      endTime,
      words,
    };
  });
}

export function getLrcDuration(lyrics: LyricLine[]): number {
  if (lyrics.length === 0) return 0;
  return lyrics[lyrics.length - 1].endTime;
}
