// Import orchestration: wasm-parse an irealb:// URL, dedup, persist to IndexedDB.
import { putPlaylist, putSongs, songId } from "./db";
import { importPlaylist } from "./tokenizer";
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

/** Import an `irealb://` URL: parse, dedup on title|author, persist songs + a playlist. */
export async function importPlaylistUrl(
  url: string,
): Promise<{ playlist: Playlist; count: number }> {
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

/** Pull an `irealb://` link out of pasted text or a dropped iReal-exported HTML file. */
export function extractIrealUrl(text: string): string | null {
  const m = text.match(/irealb:\/\/[^"'\s<>]+/);
  return m ? m[0] : null;
}
