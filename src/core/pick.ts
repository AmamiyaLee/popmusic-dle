import type { Genre, Song } from './types';

export type GenreFilter = 'all' | Genre;

export const GENRE_LABELS: Readonly<Record<GenreFilter, string>> = {
  all: '全部',
  mando: '華語',
  classic: '經典',
  tw: '台語',
  jp: '日文',
  kpop: '韓文',
  west: '西洋',
};

/** How many recent songs to keep out of the draw. */
export const RECENT_LIMIT = 40;

export function filterByGenre(songs: readonly Song[], genre: GenreFilter): readonly Song[] {
  return genre === 'all' ? songs : songs.filter(s => s.genre === genre);
}

/**
 * Picks a random song in the genre, avoiding recently played ones. When the
 * pool is smaller than the history, recent songs come back rather than
 * returning nothing.
 */
export function pickSong(
  songs: readonly Song[],
  genre: GenreFilter,
  recent: readonly string[],
  random: () => number = Math.random,
): Song | null {
  const pool = filterByGenre(songs, genre);
  if (!pool.length) return null;
  const recentSet = new Set(recent);
  const fresh = pool.filter(s => !recentSet.has(s.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(random() * from.length) % from.length];
}

export function pushRecent(recent: readonly string[], id: string, limit = RECENT_LIMIT): string[] {
  return [...recent.filter(r => r !== id), id].slice(-limit);
}
