/**
 * RSVP utility functions for text processing and display calculations
 */

/**
 * Parse text into an array of words
 * @param {string} text - The input text to parse
 * @returns {string[]} Array of words
 */
export function parseText(text) {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Calculate the Optimal Recognition Point (ORP) index for a word.
 * ORP is slightly left of the word's geometric center — that is the
 * letter the eye should lock onto. The display then pins this letter
 * to a fixed screen location so the eye does not saccade.
 *
 * Letter positions follow Spritz TABLE I (US 20140016867 A1):
 * 1 letter → 1st, 2–5 → 2nd, 6–9 → 3rd, 10–13 → 4th, 14+ → 5th.
 * Counts Unicode letters only (Latin, Cyrillic, CJK, Arabic, etc.).
 *
 * @param {string} word - The word to calculate ORP for
 * @returns {number} The 0-based index among letters that should be highlighted
 */
export function getORPIndex(word) {
  if (!word || typeof word !== "string") return 0;
  const len = word.replace(/[^\p{L}]/gu, "").length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

/**
 * Get the actual character index for ORP, accounting for leading punctuation.
 * This adjusts the ORP index to skip over non-letter characters.
 * Supports all Unicode letters.
 *
 * @param {string} word - The word to calculate actual ORP for
 * @returns {number} The actual character index in the word
 */
// Pre-compiled regex for performance
const unicodeLetterRegex = /\p{L}/u

export function getActualORPIndex(word) {
  if (!word || typeof word !== "string") return 0;

  const orpIndex = getORPIndex(word);
  let letterCount = 0;

  for (let i = 0; i < word.length; i++) {
    if (unicodeLetterRegex.test(word[i])) {
      if (letterCount === orpIndex) return i
      letterCount++
    }
  }

  return Math.min(orpIndex, word.length - 1);
}

/**
 * Calculate the display delay for a word based on WPM and punctuation.
 * Words ending with sentence punctuation get a longer pause.
 *
 * @param {string} word - The word to calculate delay for
 * @param {number} wordsPerMinute - Reading speed in WPM
 * @param {boolean} pauseOnPunctuation - Whether to add extra pause on punctuation
 * @param {number} punctuationMultiplier - Multiplier for sentence-ending punctuation
 * @returns {number} Delay in milliseconds
 */
export function getWordDelay(
  word,
  wordsPerMinute,
  pauseOnPunctuation = true,
  punctuationMultiplier = 2,
  wordLengthWPMMultiplier = 0,
) {
  if (!word || typeof word !== "string") return 60000 / wordsPerMinute;
  if (!wordsPerMinute || wordsPerMinute <= 0) return 200; // Default fallback

  var baseDelay = 60000 / wordsPerMinute;

  // Longer pause for long words (12+ characters is roughly 2 standard deviations above average English word length)
  if (wordLengthWPMMultiplier > 0 && word.length >= 12) {
    // For every character above 12, add wordLengthWPMMultiplier percentage points to delay
    baseDelay *= 1 + ((wordLengthWPMMultiplier / 100) * (word.length - 12));
  }

  if (pauseOnPunctuation) {
    // Longer pause for sentence-ending punctuation
    if (/[.!?;:]$/.test(word)) {
      return baseDelay * punctuationMultiplier;
    }
    // Shorter pause for commas
    if (/[,]$/.test(word)) {
      return baseDelay * 1.5;
    }
  }

  return baseDelay;
}

/**
 * Format remaining reading time as MM:SS
 *
 * @param {number} remainingWords - Number of words remaining
 * @param {number} wordsPerMinute - Reading speed in WPM
 * @returns {string} Formatted time string (e.g., "2:30")
 */
export function formatTimeRemaining(remainingWords, wordsPerMinute) {
  if (remainingWords <= 0 || !wordsPerMinute || wordsPerMinute <= 0) {
    return "0:00";
  }

  const seconds = Math.ceil((remainingWords / wordsPerMinute) * 60);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Split a word into parts for ORP display (before, ORP letter, after)
 *
 * @param {string} word - The word to split
 * @returns {{ before: string, orp: string, after: string }} Word parts
 */
export function splitWordForDisplay(word) {
  if (!word || typeof word !== "string") {
    return { before: "", orp: "", after: "" };
  }

  const orpIndex = getActualORPIndex(word);

  return {
    before: word.slice(0, orpIndex),
    orp: word[orpIndex] || "",
    after: word.slice(orpIndex + 1),
  };
}

/**
 * Check if a word should trigger a pause based on pause-every-N-words setting
 *
 * @param {number} wordIndex - Current word index (0-based)
 * @param {number} pauseAfterWords - Pause after every N words (0 = disabled)
 * @returns {boolean} Whether to pause
 */
export function shouldPauseAtWord(wordIndex, pauseAfterWords) {
  if (pauseAfterWords <= 0) return false;
  if (wordIndex <= 0) return false;
  return wordIndex % pauseAfterWords === 0;
}

/**
 * Extract a subset of words centered on current position
 * @param {string[]} allWords - Complete word array
 * @param {number} centerIdx - Index to center on
 * @param {number} frameSize - Total words to display (odd numbers recommended)
 * @returns {{ subset: string[], centerOffset: number }}
 */
export function extractWordFrame(allWords, centerIdx, frameSize) {
  if (frameSize <= 1 || centerIdx >= allWords.length) {
    return { subset: [allWords[centerIdx] || ""], centerOffset: 0 };
  }

  const radius = Math.floor(frameSize / 2);
  const leftBound = Math.max(0, centerIdx - radius);
  const rightBound = Math.min(allWords.length, centerIdx + radius + 1);

  const subset = allWords.slice(leftBound, rightBound);
  const centerOffset = centerIdx - leftBound;

  return { subset, centerOffset };
}

/**
 * Curated RSVP font stacks. Monospace keeps ORP alignment most stable.
 */
export const FONT_PRESETS = [
  {
    id: 'mono',
    label: 'Monospace',
    stack: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Consolas', monospace"
  },
  {
    id: 'sans',
    label: 'Sans',
    stack: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  },
  {
    id: 'serif',
    label: 'Serif',
    stack: "Georgia, 'Times New Roman', Times, serif"
  },
  {
    id: 'georgia',
    label: 'Georgia',
    stack: 'Georgia, serif'
  },
  {
    id: 'palatino',
    label: 'Palatino',
    stack: "Palatino, 'Palatino Linotype', 'Book Antiqua', 'URW Palladio L', serif"
  }
];

export const DEFAULT_FONT_FAMILY = FONT_PRESETS[0].stack;
export const DEFAULT_FONT_SIZE_REM = 4;
export const DEFAULT_FONT_BOLD = false;

/**
 * Scale an ORP-centered word so neither side clips the display.
 * The red letter stays at the screen center, so the longer side
 * (before or after the ORP) determines the scale.
 *
 * @param {number} beforeWidth - Width of text to the left of the ORP letter
 * @param {number} orpWidth - Width of the ORP letter
 * @param {number} afterWidth - Width of text to the right of the ORP letter
 * @param {number} containerWidth - Available display width
 * @param {number} [paddingRatio=0.08] - Horizontal inset reserved as padding
 * @param {number} [minScale=0.08] - Lowest allowed scale so extreme words still fit
 * @returns {number} Scale factor between minScale and 1
 */
export function computeFitScale(
  beforeWidth,
  orpWidth,
  afterWidth,
  containerWidth,
  paddingRatio = 0.08,
  minScale = 0.08
) {
  if (!containerWidth || containerWidth <= 0) return 1;
  const left = Math.max(0, beforeWidth || 0) + Math.max(0, orpWidth || 0) / 2;
  const right = Math.max(0, afterWidth || 0) + Math.max(0, orpWidth || 0) / 2;
  const neededHalf = Math.max(left, right);
  if (neededHalf <= 0) return 1;
  const availableHalf = (containerWidth * (1 - paddingRatio)) / 2;
  if (neededHalf <= availableHalf) return 1;
  return Math.max(minScale, availableHalf / neededHalf);
}

/**
 * Scale a centered word so its full width fits the display.
 *
 * @param {number} contentWidth - Measured width of the whole word
 * @param {number} containerWidth - Available display width
 * @param {number} [paddingRatio=0.08]
 * @param {number} [minScale=0.08]
 * @returns {number} Scale factor between minScale and 1
 */
export function computeWordFitScale(contentWidth, containerWidth, paddingRatio = 0.08, minScale = 0.08) {
  if (!contentWidth || contentWidth <= 0 || !containerWidth || containerWidth <= 0) return 1;
  const available = containerWidth * (1 - paddingRatio);
  if (contentWidth <= available) return 1;
  return Math.max(minScale, available / contentWidth);
}
