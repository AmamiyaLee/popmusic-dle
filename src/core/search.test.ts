import { describe, expect, it } from 'vitest';
import { isCorrect, searchSongs } from './search';
import { SAMPLE, makeSong } from './testSongs';

const ids = (q: string) => searchSongs(SAMPLE, q).map(s => s.id);

describe('searchSongs', () => {
  it('returns nothing for an empty or punctuation-only query', () => {
    expect(ids('')).toEqual([]);
    expect(ids('  ，')).toEqual([]);
  });

  it('matches Traditional title prefixes', () => {
    expect(ids('稻')).toEqual(['daoxiang']);
    expect(ids('後來')).toEqual(['houlai']);
  });

  it('does not match Simplified input', () => {
    expect(ids('后来')).toEqual([]);
  });

  it('does not match pinyin or pinyin initials', () => {
    expect(ids('qlx')).toEqual([]);
    expect(ids('daoxiang')).toEqual([]);
  });

  it('matches by artist', () => {
    expect(ids('周杰倫')).toEqual(expect.arrayContaining(['daoxiang', 'qilixiang']));
    expect(ids('周杰倫')).toHaveLength(2);
  });

  it('ranks title matches above artist matches', () => {
    const songs = [
      makeSong({ id: 'a', title: '別的歌', artist: '光良' }),
      makeSong({ id: 'b', title: '光良的歌', artist: '某人' }),
    ];
    expect(searchSongs(songs, '光良').map(s => s.id)).toEqual(['b', 'a']);
  });

  it('ranks exact matches first, then shorter titles', () => {
    const songs = [
      makeSong({ id: 'long', title: '童話鎮' }),
      makeSong({ id: 'exact', title: '童話' }),
      makeSong({ id: 'longer', title: '童話世界之旅' }),
    ];
    expect(searchSongs(songs, '童話').map(s => s.id)).toEqual(['exact', 'long', 'longer']);
  });

  it('respects the limit', () => {
    expect(searchSongs(SAMPLE, '周', 1)).toHaveLength(1);
  });

  it('matches substrings in the middle of a title', () => {
    expect(ids('代表')).toEqual(['yueliang']);
  });

  it('ignores case and spacing in Latin titles', () => {
    expect(ids('superstar')).toEqual(['superstar']);
    expect(ids('Super Star')).toEqual(['superstar']);
  });

  it('matches aliases', () => {
    const songs = [makeSong({ id: 'nh', title: '你,好不好?', aliases: ['你好不好'] })];
    expect(searchSongs(songs, '你好').map(s => s.id)).toEqual(['nh']);
  });
});

describe('isCorrect', () => {
  const daoxiang = SAMPLE[0];
  const houlai = SAMPLE[2];

  it('accepts the picked answer', () => {
    expect(isCorrect(daoxiang, { label: '稻香', songId: 'daoxiang' }, SAMPLE)).toBe(true);
  });

  it('rejects a different picked song', () => {
    expect(isCorrect(daoxiang, { label: '七里香', songId: 'qilixiang' }, SAMPLE)).toBe(false);
  });

  it('accepts a different recording with the same title', () => {
    const songs = [...SAMPLE, makeSong({ id: 'tonghua-other', title: '童話', artist: '別人' })];
    expect(isCorrect(SAMPLE[5], { label: '童話', songId: 'tonghua-other' }, songs)).toBe(true);
  });

  it('accepts the typed Traditional title, ignoring spacing and punctuation', () => {
    expect(isCorrect(houlai, { label: '後來的我們' }, SAMPLE)).toBe(true);
    expect(isCorrect(houlai, { label: ' 後來的我們！' }, SAMPLE)).toBe(true);
  });

  it('rejects Simplified Chinese', () => {
    expect(isCorrect(houlai, { label: '后来的我们' }, SAMPLE)).toBe(false);
  });

  it('rejects pinyin', () => {
    expect(isCorrect(daoxiang, { label: 'daoxiang' }, SAMPLE)).toBe(false);
    expect(isCorrect(daoxiang, { label: 'dx' }, SAMPLE)).toBe(false);
  });

  it('accepts a typed title without its annotation', () => {
    const song = makeSong({ id: 'gn', title: '光年之外 (電影主題曲)' });
    expect(isCorrect(song, { label: '光年之外' }, [song])).toBe(true);
  });

  it('rejects partial or empty typed titles', () => {
    expect(isCorrect(daoxiang, { label: '稻' }, SAMPLE)).toBe(false);
    expect(isCorrect(daoxiang, { label: '' }, SAMPLE)).toBe(false);
  });

  it('falls back to comparing the label when the picked id is unknown', () => {
    expect(isCorrect(daoxiang, { label: '稻香', songId: 'missing' }, SAMPLE)).toBe(true);
  });
});
