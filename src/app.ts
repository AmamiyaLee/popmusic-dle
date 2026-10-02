/* Controller: owns the state, wires events, calls the view. */
import { AudioLoadError, ClipPlayer } from './audio';
import { challengeUrl, readChallenge } from './core/challenge';
import { GENRE_LABELS, filterByGenre, pickSong, pushRecent, type GenreFilter } from './core/pick';
import { CLIP_STEPS, clipSeconds, giveUp, newRound, skip, submitGuess, type RoundState } from './core/round';
import type { Guess } from './core/search';
import { parseStats, recordRound, type Stats } from './core/stats';
import type { Song } from './core/types';
import { asNumber, asOneOf, asStringArray, load, save } from './storage';
import { createAutocomplete } from './ui/autocomplete';
import {
  refs, renderGenres, renderPlayhead, renderRound, renderStatTiles, renderStats, renderUnplayable,
  setDrawer, setPlaying, setStatus,
} from './ui/view';

const GENRES = Object.keys(GENRE_LABELS) as GenreFilter[];
const FULL_PREVIEW_S = 30;

export function startApp(songs: readonly Song[]): void {
  const player = new ClipPlayer();

  let genre = load('genre', asOneOf(GENRES, 'all'));
  let recent = load('recent', asStringArray);
  let stats: Stats = load('stats', parseStats);
  let round: RoundState | null = null;
  let buffer: AudioBuffer | null = null;
  /** Bumped on every new round so late audio loads for an old song are ignored. */
  let roundToken = 0;

  const volume = load('volume', asNumber(0.8));
  refs.volume.value = String(volume);
  refs.volume.style.setProperty('--fill', `${volume * 100}%`);
  player.setVolume(volume);

  const counts = Object.fromEntries(
    GENRES.map(g => [g, filterByGenre(songs, g).length]),
  ) as Record<GenreFilter, number>;
  if (counts[genre] === 0) genre = 'all';

  const pickGenre = (g: GenreFilter) => {
    if (g === genre) return;
    genre = g;
    save('genre', genre);
    renderGenres(genre, counts, pickGenre);
    setDrawer(false);
    nextSong();
  };
  renderGenres(genre, counts, pickGenre);
  renderStatTiles(stats);

  const autocomplete = createAutocomplete({
    input: refs.guess,
    list: refs.suggest,
    songs: () => songs,
    onSubmit: guess => handleGuess(guess),
  });

  function setRound(next: RoundState): void {
    const finished = round?.status === 'playing' && next.status !== 'playing';
    round = next;
    renderRound(next);
    if (finished) {
      player.stop();
      renderPlayhead(0);
      stats = recordRound(stats, next);
      save('stats', stats);
      renderStatTiles(stats);
      refs.next.focus();
    }
  }

  async function startRound(song: Song): Promise<void> {
    const token = ++roundToken;
    player.stop();
    setPlaying(false);
    renderPlayhead(0);
    buffer = null;
    recent = pushRecent(recent, song.id);
    save('recent', recent);
    autocomplete.clear();
    setRound(newRound(song));
    refs.play.disabled = true;
    refs.game.setAttribute('aria-busy', 'true');
    setStatus('載入音訊中⋯');

    try {
      const loaded = await player.load(song.preview);
      if (token !== roundToken) return;
      buffer = loaded;
      refs.play.disabled = false;
      setStatus('');
    } catch (e) {
      if (token !== roundToken) return;
      const reason = e instanceof AudioLoadError ? e.message : '音訊載入失敗';
      setStatus(`${reason}，這首不算，按「下一首」換一首。`, 'error');
      renderUnplayable();
    } finally {
      if (token === roundToken) refs.game.setAttribute('aria-busy', 'false');
    }
  }

  function nextSong(): void {
    const song = pickSong(songs, genre, recent);
    if (!song) {
      setStatus('這個分類目前沒有歌。', 'error');
      return;
    }
    void startRound(song);
  }

  function play(seconds: number, showPlayhead: boolean): void {
    player.unlock();
    if (!buffer) return;
    if (player.playing) {
      player.stop();
      return;
    }
    setPlaying(true);
    const onProgress = showPlayhead ? (p: number) => renderPlayhead(p * seconds) : undefined;
    void player.play(buffer, seconds, onProgress).then(() => {
      setPlaying(false);
      if (showPlayhead) renderPlayhead(0);
    });
  }

  function handleGuess(guess: Guess): void {
    if (!round || round.status !== 'playing') return;
    if (!guess.label.trim()) {
      refs.guess.focus();
      return;
    }
    const next = submitGuess(round, guess, songs);
    autocomplete.clear();
    setRound(next);
    if (next.status === 'playing') {
      setStatus(`不是「${guess.label}」，多聽一點試試。`);
      refs.guess.focus();
    } else {
      setStatus('');
    }
  }

  async function share(): Promise<void> {
    if (!round) return;
    const url = challengeUrl(location.href, round.song.id);
    const text = round.status === 'won'
      ? `我 ${CLIP_STEPS[round.step]} 秒就猜到這首歌，你呢？`
      : '這首歌你猜得出來嗎？';
    try {
      if (navigator.share) {
        await navigator.share({ title: '流行音樂dle', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus('已複製挑戰連結，貼給朋友吧！');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setStatus(`複製失敗，請手動複製：${url}`, 'error');
    }
  }

  refs.play.addEventListener('click', () => {
    if (round?.status === 'playing') play(clipSeconds(round), true);
  });
  refs.playFull.addEventListener('click', () => play(FULL_PREVIEW_S, false));
  refs.form.addEventListener('submit', e => {
    e.preventDefault();
    handleGuess(autocomplete.current());
  });
  refs.skip.addEventListener('click', () => {
    if (!round) return;
    const isLast = round.step >= CLIP_STEPS.length - 1;
    player.stop();
    setRound(isLast ? giveUp(round) : skip(round));
    setStatus('');
  });
  refs.next.addEventListener('click', nextSong);
  refs.reroll.addEventListener('click', () => {
    setDrawer(false);
    nextSong();
  });
  refs.share.addEventListener('click', () => void share());
  refs.volume.addEventListener('input', () => {
    const v = Number(refs.volume.value);
    player.setVolume(v);
    refs.volume.style.setProperty('--fill', `${v * 100}%`);
    save('volume', v);
  });
  refs.statsBtn.addEventListener('click', () => {
    renderStats(stats);
    setDrawer(false);
    refs.statsDialog.showModal();
  });
  refs.howtoBtn.addEventListener('click', () => refs.howtoDialog.showModal());
  refs.menuBtn.addEventListener('click', () => setDrawer(!refs.drawer.classList.contains('is-open')));
  refs.scrim.addEventListener('click', () => setDrawer(false));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setDrawer(false);
    // Space toggles playback when focus isn't in a text field or on a button.
    if (e.code !== 'Space' || e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (round?.status === 'playing') refs.play.click();
  });

  if (!load('seenHowto', v => v === true)) {
    refs.howtoDialog.showModal();
    save('seenHowto', true);
  }

  const challengeId = readChallenge(location.search);
  const challenged = challengeId ? songs.find(s => s.id === challengeId) : undefined;
  if (challengeId) history.replaceState(null, '', location.pathname);
  if (challenged) {
    void startRound(challenged).then(() => {
      if (refs.status.dataset.tone !== 'error') setStatus('朋友傳來的挑戰！');
    });
  } else {
    nextSong();
  }
}
