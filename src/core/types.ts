export type Genre = 'mando' | 'classic' | 'tw' | 'jp' | 'kpop' | 'west';

export interface Song {
  readonly id: string;
  /** Title as written — Traditional Chinese for Chinese songs, the original for others.
   * The only accepted answer, together with `aliases`. */
  readonly title: string;
  readonly artist: string;
  readonly genre: Genre;
  readonly aliases: readonly string[];
  readonly album: string;
  readonly cover: string | null;
  readonly link: string | null;
  readonly preview: string;
}

export interface Bank {
  readonly version: number;
  readonly songs: readonly Song[];
}
