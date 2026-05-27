import { LrcLine } from "../types";

// Supported chord list for transposition
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/**
 * Parses raw LRC + chord lines into an array of LrcLine elements.
 * Handles the custom format with identical timestamps on consecutive chord/lyric lines.
 */
export function parseLrcWithChords(rawText: string): LrcLine[] {
  if (!rawText) return [];
  
  const lines = rawText.split(/\r?\n/);
  const parsedLines: LrcLine[] = [];
  
  // Format regex: matches [mm:ss.xx] or [mm:ss] or [mm:ss.xxx]
  const lrcHeaderRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      // Empty line, preserve it for spacing
      parsedLines.push({
        id: `line-${index}-${Math.random().toString(36).substr(2, 4)}`,
        lineNumber: index + 1,
        timestamp: null,
        rawTimestamp: null,
        text: "",
        isChord: false,
      });
      return;
    }

    const match = line.match(lrcHeaderRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let subseconds = 0;
      
      const rawTs = `[${match[1]}:${match[2]}${match[3] ? "." + match[3] : ""}]`;
      const content = match[4] || "";

      if (match[3]) {
        const subStr = match[3];
        if (subStr.length === 2) {
          subseconds = parseInt(subStr, 10) * 10; // centiseconds -> ms
        } else {
          subseconds = parseInt(subStr, 10); // ms
        }
      }

      const totalSeconds = minutes * 60 + seconds + subseconds / 1000;
      const isChord = isChordLine(content);

      parsedLines.push({
        id: `line-${index}-${Math.random().toString(36).substr(2, 4)}`,
        lineNumber: index + 1,
        timestamp: totalSeconds,
        rawTimestamp: rawTs,
        text: content,
        isChord,
      });
    } else {
      // Line doesn't have a timestamp, but has content (e.g. section titles or info)
      parsedLines.push({
        id: `line-${index}-${Math.random().toString(36).substr(2, 4)}`,
        lineNumber: index + 1,
        timestamp: null,
        rawTimestamp: null,
        text: line,
        isChord: isChordLine(line),
      });
    }
  });

  return parsedLines;
}

/**
 * Heuristically determines if a line contains mostly chord notations.
 */
export function isChordLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Split into tokens by whitespace
  const tokens = trimmed.split(/[\s|]+/);
  if (tokens.length === 0) return false;

  // A regex matching common chords (e.g., C, Am, Dm7, F#m, C/E, G9, etc.)
  const chordPattern = /^[A-G](?:b|#)?(?:m|min|maj|dim|aug|sus|add|ø)?(?:\d+)?(?:\/[A-G](?:b|#)?)?$/i;
  
  let chordMatches = 0;
  let emptyOrSymbols = 0;
  
  for (const token of tokens) {
    const t = token.trim();
    if (!t) {
      emptyOrSymbols++;
      continue;
    }
    if (chordPattern.test(t) || ["|", "-", "//", "/", "N.C.", "NC"].includes(t)) {
      chordMatches++;
    }
  }

  const activeTokensCount = tokens.length - emptyOrSymbols;
  if (activeTokensCount === 0) return false;

  // If a line is exclusively made of short tokens, and has uppercase chord styles
  const ratio = chordMatches / activeTokensCount;
  
  // Avoid matching lyric lines that happen to have short words (e.g., "A", "E", "O")
  const hasLongWords = tokens.some(tok => tok.length > 5 && !tok.includes('/'));
  
  // Chords are monospaced and have high ratio of matches
  return ratio >= 0.6 && !hasLongWords;
}

/**
 * Transposes a single chord by a specified number of semitones.
 */
export function transposeChord(chord: string, offset: number): string {
  if (offset === 0) return chord;

  // Match the root note (C#, Db, C, etc.)
  const regex = /^([A-G](?:b|#)?)(.*)$/;
  const match = chord.match(regex);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  // Find index in sharp or flat arrays
  let index = NOTES_SHARP.indexOf(root);
  let isFlat = false;
  
  if (index === -1) {
    index = NOTES_FLAT.indexOf(root);
    isFlat = true;
  }

  if (index === -1) return chord; // Not found

  // Calculate new index
  let newIndex = (index + offset) % 12;
  if (newIndex < 0) newIndex += 12;

  // Decide whether to output flats or sharps based on input type or offset
  const newRoot = isFlat ? NOTES_FLAT[newIndex] : NOTES_SHARP[newIndex];

  // If chord has a slash chord, transpose that part too! E.g. C/E
  if (suffix.includes("/")) {
    const slashParts = suffix.split("/");
    // First part is anything before slash, second is the bass note
    // E.g., for C/E, standard suffix is empty and second element is E
    // For Am7/G, first part is m7, second part is G
    const bassNote = slashParts[1];
    const transposedBass = transposeChord(bassNote, offset);
    return newRoot + slashParts[0] + "/" + transposedBass;
  }

  return newRoot + suffix;
}

/**
 * Scans a chord line and transposes all found chords, preserving spaces.
 */
export function transposeLine(text: string, offset: number): string {
  if (offset === 0) return text;

  // This matches a chord, separated by spaces/tabs/bars
  // We use word boundaries and lookahead to make sure we don't match lyrics
  const chordRegex = /\b[A-G](?:b|#)?(?:m|min|maj|dim|aug|sus|add|ø)?(?:\d+)?(?:\/[A-G](?:b|#)?)?\b/g;

  return text.replace(chordRegex, (match) => {
    return transposeChord(match, offset);
  });
}
