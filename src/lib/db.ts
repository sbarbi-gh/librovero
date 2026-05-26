// IndexedDB persistence (via idb): songs, playlists, history.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { History, Playlist, Song } from "./types";

interface LibroDB extends DBSchema {
  songs: {
    key: string;
    value: Song;
    indexes: { byTitle: string; byAuthor: string };
  };
  playlists: { key: string; value: Playlist };
  history: { key: string; value: History };
}

const DB_NAME = "librovero";
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase<LibroDB>> | null = null;

export function db(): Promise<IDBPDatabase<LibroDB>> {
  if (!dbp) {
    dbp = openDB<LibroDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const songs = database.createObjectStore("songs", { keyPath: "id" });
        songs.createIndex("byTitle", "title");
        songs.createIndex("byAuthor", "author");
        database.createObjectStore("playlists", { keyPath: "id" });
        database.createObjectStore("history", { keyPath: "songId" });
      },
    });
  }
  return dbp;
}

/** Stable id from title + author (FNV-1a, hex). */
export function songId(title: string, author: string): string {
  const s = `${title}|${author}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export async function getSong(id: string): Promise<Song | undefined> {
  return (await db()).get("songs", id);
}

export async function allSongs(): Promise<Song[]> {
  return (await db()).getAll("songs");
}

export async function putSongs(songs: Song[]): Promise<void> {
  const d = await db();
  const tx = d.transaction("songs", "readwrite");
  await Promise.all([...songs.map((s) => tx.store.put(s)), tx.done]);
}

export async function putPlaylist(pl: Playlist): Promise<void> {
  await (await db()).put("playlists", pl);
}

export async function allPlaylists(): Promise<Playlist[]> {
  return (await db()).getAll("playlists");
}

export async function getHistory(songId: string): Promise<History | undefined> {
  return (await db()).get("history", songId);
}

export async function allHistory(): Promise<History[]> {
  return (await db()).getAll("history");
}

export async function putHistory(h: History): Promise<void> {
  await (await db()).put("history", h);
}
