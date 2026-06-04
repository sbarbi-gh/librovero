// Transposition over structured chord tokens.
// Ported from the old app's transpose.mjs; operates on ChordToken note/bass.
import { fixSpellings } from "./enharmonic";
import { isChord, type ChordToken, type Token } from "./types";

// Circle-of-fifths note spelling table (21 entries, Fb … B#).
const NOTES = [
  "Fb", "Cb", "Gb", "Db", "Ab", "Eb", "Bb",
  "F",  "C",  "G",  "D",  "A",  "E",  "B",
  "F#", "C#", "G#", "D#", "A#", "E#", "B#",
];

export const MAJOR_KEYS = [
  "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#",
];
export const MINOR_KEYS = [
  "Eb-", "Bb-", "F-", "C-", "G-", "D-", "A-", "E-", "B-", "F#-", "C#-", "G#-", "D#-",
];

export function keyIsMinor(key: string): boolean {
  return key.endsWith("-");
}

function targets(key: string): string[] {
  return keyIsMinor(key) ? MINOR_KEYS : MAJOR_KEYS;
}

export function transposeOffset(origKey: string, newKey: string): number {
  const ary = targets(origKey);
  return ary.indexOf(newKey) - ary.indexOf(origKey);
}

function transposeNote(note: string, by: number): string {
  let pos = NOTES.indexOf(note) + by;
  if (pos < 0) pos += 12;
  if (pos > 20) pos -= 12;
  return NOTES[pos] ?? note;
}

function transposeChord(chord: ChordToken, by: number): ChordToken {
  const next: ChordToken = { ...chord };
  if (chord.note !== "W") next.note = transposeNote(chord.note, by);
  if (chord.bass) next.bass = transposeNote(chord.bass, by);
  return next;
}

/** Return a new token array transposed from `origKey` to `newKey`. */
export function transpose(tokens: Token[], origKey: string, newKey: string): Token[] {
  if (origKey === newKey) return tokens;
  const by = transposeOffset(origKey, newKey);
  if (by === 0) return tokens;
  return tokens.map((t) => (isChord(t) ? transposeChord(t, by) : t));
}

/** Transpose and correct enharmonic spellings via the ONNX model. */
export async function transposeAndFix(
  tokens: Token[],
  origKey: string,
  newKey: string,
): Promise<Token[]> {
  const transposed = transpose(tokens, origKey, newKey);
  return fixSpellings(transposed);
}
