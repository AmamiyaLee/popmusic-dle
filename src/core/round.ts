import { isCorrect, type Guess } from './search';
import type { Song } from './types';

/** Seconds of audio unlocked at each step. A skip or wrong guess moves to the next one. */
export const CLIP_STEPS = [0.1, 0.5, 2, 8, 15] as const;

export type Attempt =
  | { readonly kind: 'skip' }
  | { readonly kind: 'guess'; readonly label: string; readonly correct: boolean };

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface RoundState {
  readonly song: Song;
  /** Index into CLIP_STEPS. */
  readonly step: number;
  readonly attempts: readonly Attempt[];
  readonly status: RoundStatus;
}

export function newRound(song: Song): RoundState {
  return { song, step: 0, attempts: [], status: 'playing' };
}

const MAX_CLIP = CLIP_STEPS[CLIP_STEPS.length - 1];

/**
 * Where `seconds` sits on the timeline bar, 0..1. Square-root scale, so the
 * 0.1 s and 0.5 s marks are visible instead of crammed against the left edge.
 */
export function timelineFraction(seconds: number): number {
  return Math.sqrt(Math.min(Math.max(seconds, 0), MAX_CLIP) / MAX_CLIP);
}

export function clipSeconds(state: RoundState): number {
  return CLIP_STEPS[Math.min(state.step, CLIP_STEPS.length - 1)];
}

/** Moves to the next clip length, or ends the round if there is none. */
function advance(state: RoundState, attempt: Attempt): RoundState {
  const attempts = [...state.attempts, attempt];
  const isLast = state.step >= CLIP_STEPS.length - 1;
  return isLast
    ? { ...state, attempts, status: 'lost' }
    : { ...state, attempts, step: state.step + 1 };
}

export function submitGuess(state: RoundState, guess: Guess, songs: readonly Song[]): RoundState {
  if (state.status !== 'playing' || !guess.label.trim()) return state;
  const correct = isCorrect(state.song, guess, songs);
  const attempt: Attempt = { kind: 'guess', label: guess.label.trim(), correct };
  return correct
    ? { ...state, attempts: [...state.attempts, attempt], status: 'won' }
    : advance(state, attempt);
}

export function skip(state: RoundState): RoundState {
  return state.status === 'playing' ? advance(state, { kind: 'skip' }) : state;
}

export function giveUp(state: RoundState): RoundState {
  return state.status === 'playing' ? { ...state, status: 'lost' } : state;
}
