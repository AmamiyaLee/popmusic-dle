import { describe, expect, it } from 'vitest';
import { filterByGenre, pickSong, pushRecent } from './pick';
import { SAMPLE } from './testSongs';

describe('pickSong', () => {
  it('returns null for an empty pool', () => {
    expect(pickSong([], 'all', [])).toBeNull();
  });

  it('only picks from the chosen genre', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickSong(SAMPLE, 'tw', [], () => i / 20)?.genre).toBe('tw');
    }
  });

  it('avoids recent songs', () => {
    const recent = SAMPLE.filter(s => s.id !== 'tonghua').map(s => s.id);
    expect(pickSong(SAMPLE, 'all', recent, () => 0.5)?.id).toBe('tonghua');
  });

  it('falls back to recent songs when everything was played', () => {
    const recent = SAMPLE.map(s => s.id);
    expect(pickSong(SAMPLE, 'all', recent, () => 0)).not.toBeNull();
  });

  it('stays in range when random returns 1', () => {
    expect(pickSong(SAMPLE, 'all', [], () => 1)).not.toBeNull();
  });
});

describe('filterByGenre', () => {
  it('returns everything for "all"', () => {
    expect(filterByGenre(SAMPLE, 'all')).toBe(SAMPLE);
  });
});

describe('pushRecent', () => {
  it('appends, de-duplicates and caps the history', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
    expect(pushRecent(['a', 'b'], 'a')).toEqual(['b', 'a']);
    expect(pushRecent(['a', 'b', 'c'], 'd', 2)).toEqual(['c', 'd']);
  });

  it('does not mutate the input', () => {
    const recent = ['a'];
    pushRecent(recent, 'b');
    expect(recent).toEqual(['a']);
  });
});
