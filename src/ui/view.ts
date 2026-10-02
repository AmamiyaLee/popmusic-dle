/* Rendering only — every function takes state and writes the DOM. */
import { GENRE_LABELS, type GenreFilter } from '../core/pick';
import { CLIP_STEPS, clipSeconds, timelineFraction, type RoundState } from '../core/round';
import type { Stats } from '../core/stats';
import { byId, el } from './dom';

export const refs = {
  game: byId<HTMLElement>('game'),
  menuBtn: byId<HTMLButtonElement>('menuBtn'),
  drawer: byId<HTMLElement>('drawer'),
  scrim: byId<HTMLElement>('scrim'),
  genreList: byId<HTMLElement>('genreList'),
  genrePills: byId<HTMLElement>('genrePills'),
  reroll: byId<HTMLButtonElement>('reroll'),
  statTiles: byId<HTMLElement>('statTiles'),
  statsBtn: byId<HTMLButtonElement>('statsBtn'),
  stepChips: byId<HTMLOListElement>('stepChips'),
  volume: byId<HTMLInputElement>('volume'),
  unlocked: byId<HTMLElement>('unlocked'),
  playhead: byId<HTMLElement>('playhead'),
  ticks: byId<HTMLElement>('ticks'),
  stepMarker: byId<HTMLElement>('stepMarker'),
  playRow: byId<HTMLElement>('playRow'),
  play: byId<HTMLButtonElement>('play'),
  clipLabel: byId<HTMLElement>('clipLabel'),
  form: byId<HTMLFormElement>('guessForm'),
  guess: byId<HTMLInputElement>('guess'),
  suggest: byId<HTMLUListElement>('suggest'),
  skip: byId<HTMLButtonElement>('skip'),
  skipLabel: byId<HTMLElement>('skipLabel'),
  attempts: byId<HTMLOListElement>('attempts'),
  reveal: byId<HTMLElement>('reveal'),
  cover: byId<HTMLImageElement>('cover'),
  verdict: byId<HTMLElement>('verdict'),
  songTitle: byId<HTMLElement>('songTitle'),
  songArtist: byId<HTMLElement>('songArtist'),
  playFull: byId<HTMLButtonElement>('playFull'),
  share: byId<HTMLButtonElement>('share'),
  appleLink: byId<HTMLAnchorElement>('appleLink'),
  next: byId<HTMLButtonElement>('next'),
  status: byId<HTMLElement>('status'),
  statsDialog: byId<HTMLDialogElement>('statsDialog'),
  statsBody: byId<HTMLElement>('statsBody'),
  howtoBtn: byId<HTMLButtonElement>('howtoBtn'),
  howtoDialog: byId<HTMLDialogElement>('howtoDialog'),
};

const shortSeconds = (s: number) => `${s}s`;

/** Genre buttons appear twice: the sidebar list (desktop) and the pills (centre). */
export function renderGenres(
  selected: GenreFilter,
  counts: Readonly<Record<GenreFilter, number>>,
  onPick: (g: GenreFilter) => void,
): void {
  const genres = (Object.keys(GENRE_LABELS) as GenreFilter[]).filter(g => counts[g] > 0);
  const build = (className: string, withCount: boolean) => genres.map(g => {
    const btn = el('button', { className },
      el('span', { text: GENRE_LABELS[g] }),
      ...(withCount ? [el('span', { className: 'genre-count', text: String(counts[g]) })] : []));
    btn.type = 'button';
    btn.dataset.genre = g;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(g === selected));
    btn.addEventListener('click', () => onPick(g));
    return btn;
  });
  refs.genreList.replaceChildren(...build('genre-item', true));
  refs.genrePills.replaceChildren(...build('pill', false));
}

export function renderRound(round: RoundState): void {
  const over = round.status !== 'playing';
  const current = clipSeconds(round);

  refs.unlocked.style.width = `${timelineFraction(current) * 100}%`;
  refs.ticks.replaceChildren(...CLIP_STEPS.slice(0, -1).map(s => {
    const tick = el('span', { className: 'tick' });
    tick.style.left = `${timelineFraction(s) * 100}%`;
    return tick;
  }));
  refs.stepMarker.textContent = shortSeconds(current);
  refs.stepMarker.style.left = `${timelineFraction(current) * 100}%`;
  refs.clipLabel.textContent = shortSeconds(current);

  refs.stepChips.replaceChildren(...CLIP_STEPS.map((s, i) => {
    const state = over ? (i <= round.step ? 'used' : 'locked')
      : i < round.step ? 'used' : i === round.step ? 'current' : 'locked';
    return el('li', { className: `chip chip-${state}`, text: shortSeconds(s) });
  }));

  refs.skipLabel.textContent = round.step < CLIP_STEPS.length - 1
    ? `跳過 +${shortSeconds(Number((CLIP_STEPS[round.step + 1] - CLIP_STEPS[round.step]).toFixed(1)))}`
    : '放棄';

  refs.attempts.replaceChildren(...round.attempts.map(a => {
    if (a.kind === 'skip') return el('li', { className: 'attempt attempt-skip', text: '跳過' });
    return el('li', { className: `attempt ${a.correct ? 'attempt-right' : 'attempt-wrong'}` },
      el('span', { className: 'attempt-mark', text: a.correct ? '✓' : '✕' }),
      el('span', { className: 'attempt-label', text: a.label }));
  }));

  refs.game.classList.toggle('is-over', over);
  refs.playRow.hidden = over;
  refs.form.hidden = over;
  refs.reveal.hidden = !over;
  if (over) renderReveal(round);
}

const WIN_LINES = ['神耳！', '太強了', '厲害', '不錯喔', '好險！'];

function renderReveal(round: RoundState): void {
  const { song } = round;
  const won = round.status === 'won';
  refs.verdict.textContent = won ? `${WIN_LINES[round.step]} ${shortSeconds(CLIP_STEPS[round.step])} 猜中` : '可惜，答案是';
  refs.verdict.className = `verdict ${won ? 'verdict-win' : 'verdict-lose'}`;
  refs.songTitle.textContent = song.title;
  refs.songArtist.textContent = song.album ? `${song.artist} · ${song.album}` : song.artist;
  refs.cover.hidden = !song.cover;
  if (song.cover) {
    refs.cover.src = song.cover;
    refs.cover.alt = `${song.title} 專輯封面`;
  }
  refs.appleLink.hidden = !song.link;
  if (song.link) refs.appleLink.href = song.link;
  refs.playFull.hidden = false;
  refs.share.hidden = false;
}

/** Shown when a preview can't be loaded: only "next" is offered, the round doesn't count. */
export function renderUnplayable(): void {
  refs.playRow.hidden = true;
  refs.form.hidden = true;
  refs.reveal.hidden = false;
  refs.verdict.textContent = '';
  refs.songTitle.textContent = '這首暫時無法播放';
  refs.songArtist.textContent = '';
  refs.cover.hidden = true;
  refs.playFull.hidden = true;
  refs.share.hidden = true;
  refs.appleLink.hidden = true;
}

export function renderStatTiles(stats: Stats): void {
  const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const tile = (value: string | number, label: string, accent = false) =>
    el('div', { className: `tile${accent ? ' tile-accent' : ''}` },
      el('b', { text: String(value) }), el('span', { text: label }));
  refs.statTiles.replaceChildren(
    tile(stats.streak, '連勝', stats.streak > 0),
    tile(stats.bestStreak, '最佳'),
    tile(`${rate}%`, '猜中率'),
  );
}

/** Fills the timeline up to `seconds` while a clip plays. */
export function renderPlayhead(seconds: number): void {
  refs.playhead.style.width = `${timelineFraction(seconds) * 100}%`;
}

export function setPlaying(playing: boolean): void {
  refs.play.classList.toggle('is-playing', playing);
  refs.play.setAttribute('aria-label', playing ? '停止' : '播放');
  refs.playFull.textContent = playing ? '停止' : '聽 30 秒';
}

export function setStatus(message: string, tone: 'info' | 'error' = 'info'): void {
  refs.status.textContent = message;
  refs.status.dataset.tone = tone;
}

export function setDrawer(open: boolean): void {
  refs.drawer.classList.toggle('is-open', open);
  refs.scrim.hidden = !open;
  refs.menuBtn.setAttribute('aria-expanded', String(open));
  refs.menuBtn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
}

export function renderStats(stats: Stats): void {
  const rate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const max = Math.max(1, ...stats.wins);
  const tile = (value: string | number, label: string) =>
    el('div', { className: 'tile' }, el('b', { text: String(value) }), el('span', { text: label }));

  refs.statsBody.replaceChildren(
    el('div', { className: 'stat-row' },
      tile(stats.played, '總局數'),
      tile(`${rate}%`, '猜中率'),
      tile(stats.streak, '目前連勝'),
      tile(stats.bestStreak, '最佳連勝')),
    el('h3', { text: '幾秒猜到' }),
    el('ol', { className: 'histogram' }, ...CLIP_STEPS.map((s, i) => {
      const bar = el('span', { className: 'hist-bar', text: String(stats.wins[i]) });
      bar.style.width = `${Math.max(8, (stats.wins[i] / max) * 100)}%`;
      return el('li', {}, el('span', { className: 'hist-label', text: shortSeconds(s) }), bar);
    })),
  );
}
