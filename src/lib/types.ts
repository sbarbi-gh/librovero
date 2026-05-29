// Wire-format token types produced by the Rust tokenizer (structured/extended form).
// Kept in sync with ireal-tokenizer/src/tokens.rs.

/** Structural-atom token type tags. XSpace and YSpace are consumed by the tokenizer. */
export type AtomType =
  | "bar"
  | "rlb"
  | "section"
  | "ending"
  | "annot"
  | "chrdspec"
  | "setfont"
  | "comment";

/** A structural atom: `[type, content, cx, cy]` — all atoms carry grid coordinates. */
export type Atom = [AtomType, string, number, number];

/** A chord — the one compound token. `note` is the root, or `"W"` for an invisible root. */
export interface ChordToken {
  type: "chord";
  note: string;
  quality?: string;
  literal_quality?: string;
  tensions?: string[];
  bass?: string;
  optional?: boolean;
  cx: number;
  cy: number;
}

/** A time-signature token. */
export interface TimeSigToken {
  type: "timesig";
  numerator: number;
  denominator: number;
  cx: number;
  cy: number;
}

export type Token = Atom | ChordToken | TimeSigToken;

export const isAtom = (t: Token): t is Atom => Array.isArray(t);
export const isChord = (t: Token): t is ChordToken =>
  !Array.isArray(t) && t.type === "chord";
export const isTimeSig = (t: Token): t is TimeSigToken =>
  !Array.isArray(t) && t.type === "timesig";

/** A song as returned by `import_playlist_songs_wasm` (snake_case from serde). */
export interface ImportedSong {
  title: string;
  author: string;
  genre: string;
  key: string; // "C", "A-", ...
  tonality: Token[];
  tokens: Token[];
  transpose: string;
  comp_style: string;
  tempo: number;
}

export interface ImportedPlaylist {
  title: string;
  songs: ImportedSong[];
}

/** A song persisted in IndexedDB. */
export interface Song {
  id: string; // stable hash of `${title}|${author}`
  title: string;
  author: string;
  genre: string;
  key: string;
  tonality: Token[];
  tokens: Token[];
  transpose: string;
  compStyle: string;
  tempo: number;
}

export interface Playlist {
  id: string;
  name: string;
  importedAt: number;
  songIds: string[];
}

/** Per-song open history, drives frecency ranking and the remembered key. */
export interface History {
  songId: string;
  count: number;
  lastOpened: number;
  opens: number[]; // recent open timestamps
  lastKey: string; // remembered (possibly transposed) key
}
