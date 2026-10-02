import { norm, stripAnnotations } from './normalize';
import type { Song } from './types';

/** Rank buckets — lower is better. */
const RANK = {
  exact: 0,
  titlePrefix: 1,
  titleContains: 2,
  artist: 3,
} as const;

/** Accepted spellings of a title: the title itself, without annotations, and its aliases. */
function titleForms(song: Song): string[] {
  return [song.title, stripAnnotations(song.title), ...song.aliases].map(norm);
}

function rankSong(song: Song, q: string): number | null {
  const titles = titleForms(song);
  if (titles.includes(q)) return RANK.exact;
  if (titles.some(t => t.startsWith(q))) return RANK.titlePrefix;
  if (titles.some(t => t.includes(q))) return RANK.titleContains;
  if (norm(song.artist).includes(q)) return RANK.artist;
  return null;
}

/**
 * Autocomplete over the song bank. Matches the title as written
 * (Traditional Chinese) or the artist — no Simplified or pinyin.
 */
export function searchSongs(songs: readonly Song[], query: string, limit = 8): Song[] {
  const q = norm(query);
  if (!q) return [];
  return songs
    .flatMap(song => {
      const rank = rankSong(song, q);
      return rank === null ? [] : [{ song, rank }];
    })
    .sort((a, b) => a.rank - b.rank || a.song.title.length - b.song.title.length)
    .slice(0, limit)
    .map(r => r.song);
}

export interface Guess {
  /** What the player typed or picked, shown in the attempt list. */
  readonly label: string;
  /** Set when the player picked an entry from the suggestions. */
  readonly songId?: string;
}

/**
 * A guess is right when it names the answer's title. Picking a different
 * recording with the same title (e.g. another artist's 童話) also counts —
 * the game is about recognising the song, not the catalogue entry.
 */
export function isCorrect(answer: Song, guess: Guess, songs: readonly Song[]): boolean {
  if (guess.songId === answer.id) return true;
  const accepted = new Set(titleForms(answer));
  const picked = guess.songId ? songs.find(s => s.id === guess.songId) : undefined;
  if (picked) return titleForms(picked).some(t => accepted.has(t));
  const typed = norm(guess.label);
  return typed.length > 0 && accepted.has(typed);
}
