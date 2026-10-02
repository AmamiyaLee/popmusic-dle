/* Combobox for song guesses: arrow keys move, Enter picks, Escape closes.
 * Enter is ignored while an IME (注音 / 拼音) is still composing, otherwise
 * picking a character would submit the half-typed guess. */
import { searchSongs, type Guess } from '../core/search';
import type { Song } from '../core/types';

export interface AutocompleteOptions {
  readonly input: HTMLInputElement;
  readonly list: HTMLUListElement;
  readonly songs: () => readonly Song[];
  readonly onSubmit: (guess: Guess) => void;
}

export interface Autocomplete {
  clear(): void;
  /** The guess currently in the box: the highlighted suggestion, or the raw text. */
  current(): Guess;
}

export function createAutocomplete({ input, list, songs, onSubmit }: AutocompleteOptions): Autocomplete {
  let results: Song[] = [];
  let active = -1;
  let picked: Song | null = null;
  let composing = false;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const render = () => {
    list.replaceChildren(...results.map((song, i) => {
      const li = document.createElement('li');
      li.id = `opt-${i}`;
      li.role = 'option';
      li.className = 'suggest-item';
      li.setAttribute('aria-selected', String(i === active));
      const title = document.createElement('span');
      title.className = 'suggest-title';
      title.textContent = song.title;
      const artist = document.createElement('span');
      artist.className = 'suggest-artist';
      artist.textContent = song.artist;
      li.append(title, artist);
      // mousedown, not click: fires before the input loses focus.
      li.addEventListener('mousedown', e => {
        e.preventDefault();
        choose(song);
        onSubmit(current());
      });
      return li;
    }));
    const open = results.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `opt-${active}`);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const update = () => {
    picked = null;
    results = searchSongs(songs(), input.value);
    active = results.length ? 0 : -1;
    render();
  };

  const choose = (song: Song) => {
    picked = song;
    input.value = song.title;
    results = [];
    active = -1;
    close();
  };

  const current = (): Guess => {
    if (active >= 0 && results[active]) {
      const s = results[active];
      return { label: s.title, songId: s.id };
    }
    return picked ? { label: picked.title, songId: picked.id } : { label: input.value };
  };

  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; update(); });
  input.addEventListener('input', () => { if (!composing) update(); });
  input.addEventListener('blur', close);
  input.addEventListener('focus', () => { if (input.value && !picked) update(); });

  input.addEventListener('keydown', e => {
    if (e.isComposing || composing || e.keyCode === 229) {
      // Some browsers (Safari) would otherwise submit the form when Enter confirms a character.
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    const n = results.length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      active = (active + 1) % n;
      render();
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      active = (active - 1 + n) % n;
      render();
    } else if (e.key === 'Escape') {
      results = [];
      active = -1;
      close();
    }
  });

  return {
    clear() {
      input.value = '';
      picked = null;
      results = [];
      active = -1;
      close();
    },
    current,
  };
}
