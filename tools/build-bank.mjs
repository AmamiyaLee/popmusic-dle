/* Builds public/bank.json — the song bank the game loads — by joining
 * data/songs.json with data/previews.json. Songs without a preview are left out.
 *
 *   node tools/build-bank.mjs
 */
import { BANK_FILE, PREVIEWS_FILE, loadSongs, readJson, writeJson } from './lib.mjs';

function main() {
  const songs = loadSongs();
  const previews = readJson(PREVIEWS_FILE, {});
  const skipped = [];

  const bank = songs.flatMap(song => {
    const p = previews[song.id];
    if (!p?.url) {
      skipped.push(song);
      return [];
    }
    return [{
      id: song.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre,
      aliases: song.aliases ?? [],
      album: p.album,
      cover: p.cover,
      link: p.link,
      preview: p.url,
    }];
  });

  writeJson(BANK_FILE, { version: 1, builtAt: new Date().toISOString(), songs: bank }, false);

  const byGenre = bank.reduce((acc, s) => ({ ...acc, [s.genre]: (acc[s.genre] ?? 0) + 1 }), {});
  console.log(`public/bank.json:${bank.length} 首`, byGenre);
  if (skipped.length) {
    console.log(`${skipped.length} 首沒有試聽網址,已略過(先跑 npm run data:fetch):`);
    skipped.forEach(s => console.log(`  ${s.id}  ${s.title} — ${s.artist}`));
  }
}

try {
  main();
} catch (e) {
  console.error(`錯誤:${e.message}`);
  process.exit(1);
}
