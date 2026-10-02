/* Looks up Apple's official 30-second preview for every song in
 * data/songs.json and records it in data/previews.json.
 *
 * Only URLs are stored — no audio is downloaded. The browser streams the
 * preview from Apple at play time (Apple's CDN sends Access-Control-Allow-Origin: *).
 *
 *   node tools/fetch-previews.mjs                 fill in what is missing
 *   node tools/fetch-previews.mjs --force         refetch everything
 *   node tools/fetch-previews.mjs --only id1,id2  specific ids
 *   node tools/fetch-previews.mjs --country HK    force one store for every song
 *   node tools/fetch-previews.mjs --delay 3000    ms between calls (API allows ~20/min)
 *
 * Store per song: `country` in songs.json, else GENRE_COUNTRY (jp → JP,
 * kpop / west → US), else TW.
 *
 * Entries come back with a confidence; listen to the non-"high" ones —
 * a cover version often matches title and artist perfectly.
 */
import fs from 'node:fs';
import { GENRE_COUNTRY, PREVIEWS_FILE, loadSongs, readJson, writeJson, scoreMatch } from './lib.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const FORCE = argv.includes('--force');
const ONLY = flag('only', '').split(',').map(s => s.trim()).filter(Boolean);
const COUNTRY_OVERRIDE = flag('country', null);
const countryFor = song => COUNTRY_OVERRIDE ?? song.country ?? GENRE_COUNTRY[song.genre] ?? 'TW';
const DELAY = parseInt(flag('delay', '3000'), 10);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(term, country, attempt = 1) {
  const url = 'https://itunes.apple.com/search?'
    + new URLSearchParams({ term, media: 'music', entity: 'song', country, limit: '10' });
  const res = await fetch(url, { headers: { 'User-Agent': 'popmusic-dle-tools/0.1' } });
  if (!res.ok) {
    if (attempt <= 3) {
      const wait = 10000 * attempt;
      console.log(`    HTTP ${res.status},${wait / 1000} 秒後重試⋯`);
      await sleep(wait);
      return search(term, country, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

const bigCover = url => url ? url.replace(/\/\d+x\d+bb\.(jpg|png)$/, '/600x600bb.$1') : null;

async function lookup(song) {
  const country = countryFor(song);
  const results = (await search(`${song.title} ${song.artist}`, country)).filter(r => r.previewUrl);
  let best = null, bestScore = -Infinity;
  for (const item of results) {
    const s = scoreMatch(song, item);
    if (s > bestScore) { bestScore = s; best = item; }
  }
  if (!best || bestScore < 2) return null;
  return {
    url: best.previewUrl,
    trackId: best.trackId,
    title: best.trackName,
    artist: best.artistName,
    album: best.collectionName || '',
    cover: bigCover(best.artworkUrl100),
    link: best.trackViewUrl || null,
    released: (best.releaseDate || '').slice(0, 4) || null,
    country,
    conf: bestScore >= 6 ? 'high' : bestScore >= 4 ? 'medium' : 'low',
  };
}

async function main() {
  const songs = loadSongs();
  const existing = readJson(PREVIEWS_FILE, {});
  let targets = songs;
  if (ONLY.length) targets = songs.filter(s => ONLY.includes(s.id));
  else if (!FORCE) targets = songs.filter(s => !existing[s.id]);

  if (!targets.length) {
    console.log('\n沒有要抓的。用 --force 全部重抓,或 --only <id> 指定單首。\n');
    return;
  }
  console.log(`\n商店 ${COUNTRY_OVERRIDE ?? '依曲風'} ·${targets.length} 首 · 間隔 ${DELAY}ms · 約 ${Math.ceil(targets.length * DELAY / 60000)} 分鐘\n`);

  const result = { ...existing };
  const missing = [], unsure = [];
  for (let i = 0; i < targets.length; i++) {
    const song = targets[i];
    const tag = `[${String(i + 1).padStart(3)}/${targets.length}]`;
    try {
      const hit = await lookup(song);
      if (!hit) {
        missing.push(song);
        if (ONLY.length) {
          // A targeted refetch is how a wrong match gets corrected, so drop the old one.
          delete result[song.id];
          console.log(`${tag} 找不到 ${song.title} — ${song.artist}(已移除舊資料)`);
        } else {
          // In bulk runs an empty answer may just be the API having a bad moment;
          // keep the old URL rather than silently shrinking the bank.
          console.log(`${tag} 找不到 ${song.title} — ${song.artist}${existing[song.id] ? '(保留舊網址)' : ''}`);
        }
      } else {
        result[song.id] = hit;
        console.log(`${tag} ${hit.conf === 'high' ? 'OK ' : '?? '} ${song.title} — ${song.artist}`
          + (hit.conf === 'high' ? '' : `  →  ${hit.title} — ${hit.artist} 《${hit.album}》`));
        if (hit.conf !== 'high') unsure.push({ song, hit });
      }
    } catch (e) {
      console.log(`${tag} 失敗 ${song.title}:${e.message}`);
      missing.push(song);
    }
    // Save as we go so an interrupted run keeps its progress.
    if (i % 10 === 9) writeJson(PREVIEWS_FILE, result);
    if (i < targets.length - 1) await sleep(DELAY);
  }
  writeJson(PREVIEWS_FILE, result);

  console.log(`\n===== previews.json 共 ${Object.keys(result).length} 首 =====`);
  if (unsure.length) {
    console.log(`\n${unsure.length} 首信心度不足,請試聽確認:`);
    unsure.forEach(({ song, hit }) => console.log(`  ${song.id}  →  ${hit.title} — ${hit.artist} 《${hit.album}》`));
  }
  if (missing.length) {
    console.log(`\n${missing.length} 首沒抓到:`);
    missing.forEach(s => console.log(`  ${s.id}  ${s.title} — ${s.artist}`));
  }
  writeSummary(targets.length, Object.keys(result).length, unsure, missing);
}

/** On GitHub Actions, list what needs a human on the run's summary page. */
function writeSummary(fetched, total, unsure, missing) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const cell = s => String(s).replace(/\|/g, '\\|');
  const lines = [`## 試聽網址更新`, '', `本次查詢 ${fetched} 首,題庫共 ${total} 首有試聽。`, ''];
  if (unsure.length) {
    lines.push(`### ⚠️ ${unsure.length} 首信心度不足,請試聽確認`, '', '| id | 題庫 | 配到 |', '| --- | --- | --- |');
    unsure.forEach(({ song, hit }) => lines.push(
      `| ${cell(song.id)} | ${cell(song.title)} — ${cell(song.artist)} | [${cell(hit.title)} — ${cell(hit.artist)}](${hit.url}) |`));
    lines.push('');
  }
  if (missing.length) {
    lines.push(`### ❌ ${missing.length} 首找不到`, '', '| id | 歌曲 |', '| --- | --- |');
    missing.forEach(s => lines.push(`| ${cell(s.id)} | ${cell(s.title)} — ${cell(s.artist)} |`));
    lines.push('');
  }
  if (!unsure.length && !missing.length) lines.push('✅ 全部配對成功。');
  try {
    fs.appendFileSync(file, lines.join('\n') + '\n');
  } catch (e) {
    console.warn(`無法寫入 GitHub 摘要:${e.message}`);
  }
}

main().catch(e => {
  console.error(`\n錯誤:${e.message}`);
  process.exit(1);
});
