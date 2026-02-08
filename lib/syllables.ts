/**
 * Estimate the number of syllables in a word.
 * Uses a simple heuristic based on vowel groups.
 * Works for English and Romance languages (Spanish, French, Portuguese, Italian).
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z\u00e0-\u00ff]/g, "");
  if (w.length <= 2) return 1;

  // Count vowel groups (consecutive vowels = 1 syllable)
  const vowelPattern = /[aeiouy\u00e0-\u00ff]+/gi;
  const matches = w.match(vowelPattern);
  let count = matches ? matches.length : 1;

  // Adjust for silent 'e' at end (English)
  if (w.endsWith("e") && !w.endsWith("le") && count > 1) {
    count--;
  }

  // Adjust for common diphthongs that are one syllable
  const diphthongs = /[aeiou]{2}/gi;
  const dipMatches = w.match(diphthongs);
  if (dipMatches) {
    // Not all consecutive vowels are diphthongs, but many are
    // Be conservative - only subtract half
    count -= Math.floor(dipMatches.length * 0.3);
  }

  return Math.max(1, count);
}

/**
 * Given words and a line time range, distribute time proportionally
 * based on syllable count rather than character count.
 * This gives more time to multi-syllable words and less to short ones.
 */
export function distributeTimeBySyllables(
  words: string[],
  lineStart: number,
  lineEnd: number
): { text: string; startTime: number; endTime: number }[] {
  if (words.length === 0) return [];

  const lineDuration = lineEnd - lineStart;

  // Count syllables for each word
  const syllableCounts = words.map((w) => countSyllables(w));
  const totalSyllables = syllableCounts.reduce((sum, s) => sum + s, 0);

  let currentTime = lineStart;
  return words.map((word, i) => {
    const fraction = syllableCounts[i] / totalSyllables;
    const wordDuration = lineDuration * fraction;
    const startTime = currentTime;
    const endTime = currentTime + wordDuration;
    currentTime = endTime;

    return { text: word, startTime, endTime };
  });
}
