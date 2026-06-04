// Import orchestration: wasm-parse an irealb:// or irealbook:// URL, dedup, persist to IndexedDB.
import { putPlaylist, putSongs, songId } from "./db";
import { importPlaylist, importSong } from "./tokenizer";
import type { ImportedSong, Playlist, Song } from "./types";

function toSong(s: ImportedSong): Song {
  return {
    id: songId(s.title, s.author),
    title: s.title,
    author: s.author,
    genre: s.genre,
    key: s.key,
    tonality: s.tonality,
    tokens: s.tokens,
    transpose: s.transpose,
    compStyle: s.comp_style,
    tempo: s.tempo,
  };
}

// ── irealbook:// support ──────────────────────────────────────────────────────
// The old irealbook:// format stores chord notation unobfuscated.
// The modern irealb:// format scrambles it with a 50-char block permutation.
// unscramble() is its own inverse, so applying it once re-scrambles the raw body
// into what import_song_wasm expects (it will unscramble back to the original).

const OBFUSC = [
  49, 48, 47, 46, 45, 5, 6, 7, 8, 9, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30,
  29, 28, 27, 26, 24, 25, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10,
  40, 41, 42, 43, 44, 4, 3, 2, 1, 0,
];

function unscramble(s: string): string {
  const h = [...s];
  let start = 0;
  while (h.length - start > 51) {
    const p = OBFUSC.map((i) => h[i + start]);
    h.splice(start, 50, ...p);
    start += 50;
  }
  return h.join("");
}

/**
 * Convert one irealbook:// song string (`title=author=genre=key=transpose=body`)
 * into an irealb://-compatible link that import_song_wasm can parse.
 */
function irealbookSongToLink(s: string): string {
  let pos = -1;
  for (let i = 0; i < 5; i++) {
    pos = s.indexOf("=", pos + 1);
    if (pos === -1) throw new Error("malformed irealbook song string");
  }
  const [title, author, genre, key, transpose] = s.slice(0, pos).split("=");
  const body = s.slice(pos + 1);
  const scrambled = unscramble(body);
  return `${title}=${author}==${genre}=${key}=${transpose}=1r34LbKcu7${scrambled}==0=`;
}

async function importIrealbookUrl(
  url: string,
): Promise<{ playlist: Playlist; count: number }> {
  const content = decodeURIComponent(url.slice("irealbook://".length));
  const parts = content.split("===");
  let songStrings: string[];
  let title: string;
  if (parts.length === 1) {
    songStrings = parts;
    // Use the song's own title as the playlist name.
    title = parts[0].split("=")[0] ?? "Imported";
  } else {
    songStrings = parts.slice(0, -1);
    title = parts[parts.length - 1];
  }

  const imported: ImportedSong[] = [];
  for (const s of songStrings) {
    if (!s.trim()) continue;
    try {
      const link = irealbookSongToLink(s);
      imported.push(await importSong(link));
    } catch {
      // Skip malformed entries.
    }
  }

  const songs = imported.map(toSong);
  await putSongs(songs);

  const playlist: Playlist = {
    id: songId(title, String(Date.now())),
    name: title || "Imported playlist",
    importedAt: Date.now(),
    songIds: songs.map((s) => s.id),
  };
  await putPlaylist(playlist);
  return { playlist, count: songs.length };
}

/** Import an `irealb://` or `irealbook://` URL: parse, dedup, persist songs + a playlist. */
export async function importPlaylistUrl(
  url: string,
): Promise<{ playlist: Playlist; count: number }> {
  if (url.startsWith("irealbook://")) return importIrealbookUrl(url);

  const parsed = await importPlaylist(url);
  const songs: Song[] = parsed.songs.map(toSong);
  await putSongs(songs);

  const playlist: Playlist = {
    id: songId(parsed.title, String(Date.now())),
    name: parsed.title || "Imported playlist",
    importedAt: Date.now(),
    songIds: songs.map((s) => s.id),
  };
  await putPlaylist(playlist);
  return { playlist, count: songs.length };
}

/** Pull an `irealb://` or `irealbook://` link out of pasted text or a dropped HTML file. */
export function extractIrealUrl(text: string): string | null {
  const m = text.match(/ireal(?:book)?:\/\/[^"'\s<>]+/);
  return m ? m[0] : null;
}
