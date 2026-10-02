/* Shared helpers for the data tools.
 *
 * norm(), BAD, BAD_ALBUM and scoreMatch() are ported from
 * ntupm18th/ntupm-songguesser (tools/fetch-previews.js, MIT licence,
 * © 2026 NTUPM 18th). They filter out live / karaoke / TV-show recordings
 * whose title and artist match perfectly but sound nothing like the original.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SONGS_FILE = path.join(ROOT, 'data', 'songs.json');
export const PREVIEWS_FILE = path.join(ROOT, 'data', 'previews.json');
export const BANK_FILE = path.join(ROOT, 'public', 'bank.json');

export function norm(s) {
  return String(s || '')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[（）()\[\]【】「」『』、・·,，.。!！?？\-—_'"‘’“”]/g, '');
}

export const BAD = /live|instrumental|karaoke|cover|remix|version|伴奏|現場|演唱會|純音樂/i;

export const BAD_ALBUM = /第\s*\d+\s*期|演唱會|跨年|金曲撈|我是歌手|蒙面|聲生不息|好聲音|影音全記錄|串燒|卡拉|karaoke|オルゴール|音樂盒|音乐盒|instrumental|伴奏/i;

/** "光年之外 (電影《Passengers》主題曲)" → "光年之外". */
export function stripAnnotations(title) {
  return String(title || '')
    .replace(/\s*[(（【[].*?[)）】\]]\s*/g, ' ')
    .replace(/\s+[-–—]\s+.*$/, '')
    .trim();
}

/** Store used when a song does not set `country`: Japanese titles come back
 * romanised from the TW store, and K-pop artists come back in Chinese
 * (BTS → 防彈少年團), so those genres are looked up elsewhere. */
export const GENRE_COUNTRY = { jp: 'JP', kpop: 'US', west: 'US' };

export const GENRES = ['mando', 'classic', 'tw', 'jp', 'kpop', 'west'];

function titleScore(song, item) {
  const st = norm(song.title);
  // Subtitles are compared away, but BAD still sees them, so "(Live)" is penalised.
  // The raw form is also checked: "내가 제일 잘 나가 (I Am the Best)" keeps the English in brackets.
  const forms = [norm(stripAnnotations(item.trackName)), norm(item.trackName)];
  if (forms.includes(st)) return 4;
  if (forms.some(t => t && (t.includes(st) || st.includes(t)))) return 2;
  return null;
}

function artistScore(song, item) {
  const a = norm(item.artistName);
  const names = [song.artist, ...(song.artistAliases ?? [])].map(norm);
  if (names.includes(a)) return 3;
  if (names.some(n => a.includes(n) || n.includes(a))) return 2;
  return null;
}

export function scoreMatch(song, item) {
  const ts = titleScore(song, item);
  // A different song by the same artist would otherwise pass on the artist score alone.
  if (ts === null) return -Infinity;
  const as = artistScore(song, item);
  // Same title by someone else is a cover, not the song we want.
  if (as === null) return -Infinity;
  let s = ts + as;
  if (BAD.test(item.trackName)) s -= 3;
  if (BAD_ALBUM.test(item.collectionName || '')) s -= 5;
  return s;
}

const KANA_HANGUL = /[぀-ヿ가-힯ᄀ-ᇿ]/;

/** Stable id from title + artist, e.g. 稻香/周杰倫 → "daoxiang-zhoujielun".
 * Kana and Hangul have no pinyin, so those parts get a short hash to stay unique. */
export function songId(song) {
  const slug = s => {
    const base = pinyin(s, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!KANA_HANGUL.test(s) && base) return base;
    const hash = crypto.createHash('sha1').update(s).digest('hex').slice(0, 6);
    return base ? `${base}${hash}` : hash;
  };
  return `${slug(song.title)}-${slug(song.artist)}`;
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error(`無法讀取 ${path.relative(ROOT, file)}:${e.message}`);
  }
}

export function writeJson(file, data, pretty = true) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, pretty ? 2 : 0) + '\n');
}

/** Loads the hand-maintained seed list and attaches ids; fails on duplicates. */
export function loadSongs() {
  const songs = readJson(SONGS_FILE, null);
  if (!Array.isArray(songs)) throw new Error('data/songs.json 必須是陣列');
  const seen = new Map();
  return songs.map((s, i) => {
    if (!s.title || !s.artist || !s.genre) {
      throw new Error(`data/songs.json 第 ${i + 1} 筆缺少 title / artist / genre`);
    }
    if (!GENRES.includes(s.genre)) {
      throw new Error(`data/songs.json 第 ${i + 1} 筆 genre「${s.genre}」不合法,可用:${GENRES.join(', ')}`);
    }
    const id = songId(s);
    if (seen.has(id)) throw new Error(`重複的歌:${s.title} — ${s.artist}(第 ${seen.get(id) + 1} 與 ${i + 1} 筆)`);
    seen.set(id, i);
    return { ...s, id };
  });
}
