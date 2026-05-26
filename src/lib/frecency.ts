// Recency-weighted frequency ("frecency") ranking + history updates.
import type { History } from "./types";

const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000; // two weeks

/** Frecency score: open count decayed by time since last open. Higher = more relevant. */
export function frecency(h: History, now: number = Date.now()): number {
  const age = Math.max(0, now - h.lastOpened);
  return h.count * Math.pow(0.5, age / HALF_LIFE_MS);
}

/** Record a fresh open of a song in `key`: bumps count + recency, remembers the key. */
export function touch(
  h: History | undefined,
  songId: string,
  key: string,
  now: number = Date.now(),
): History {
  const opens = (h?.opens ?? []).concat(now).slice(-50);
  return {
    songId,
    count: (h?.count ?? 0) + 1,
    lastOpened: now,
    opens,
    lastKey: key,
  };
}

/** Update the remembered key without counting a new open (used when transposing). */
export function rememberKey(h: History, key: string): History {
  return { ...h, lastKey: key };
}
