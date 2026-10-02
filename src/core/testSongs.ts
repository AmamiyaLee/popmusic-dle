import type { Genre, Song } from './types';

/** Builds a Song for tests; only the fields that matter need to be given. */
export function makeSong(overrides: Partial<Song> & { id: string; title: string }): Song {
  return {
    artist: '測試歌手',
    genre: 'mando' as Genre,
    aliases: [],
    album: '',
    cover: null,
    link: null,
    preview: `https://example.com/${overrides.id}.m4a`,
    ...overrides,
  };
}

export const SAMPLE: readonly Song[] = [
  makeSong({ id: 'daoxiang', title: '稻香', artist: '周杰倫' }),
  makeSong({ id: 'qilixiang', title: '七里香', artist: '周杰倫' }),
  makeSong({ id: 'houlai', title: '後來的我們', artist: '五月天' }),
  makeSong({ id: 'superstar', title: 'Super Star', artist: 'S.H.E' }),
  makeSong({ id: 'jiahou', title: '家後', artist: '江蕙', genre: 'tw' }),
  makeSong({ id: 'tonghua', title: '童話', artist: '光良' }),
  makeSong({ id: 'yueliang', title: '月亮代表我的心', artist: '鄧麗君', genre: 'classic' }),
];
