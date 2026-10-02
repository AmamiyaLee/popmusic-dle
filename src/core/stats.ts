import { CLIP_STEPS, type RoundState } from './round';

export interface Stats {
  readonly played: number;
  readonly won: number;
  readonly streak: number;
  readonly bestStreak: number;
  /** wins[i] = rounds won at CLIP_STEPS[i]. */
  readonly wins: readonly number[];
}

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  streak: 0,
  bestStreak: 0,
  wins: CLIP_STEPS.map(() => 0),
};

export function recordRound(stats: Stats, round: RoundState): Stats {
  if (round.status === 'playing') return stats;
  if (round.status === 'lost') {
    return { ...stats, played: stats.played + 1, streak: 0 };
  }
  const streak = stats.streak + 1;
  return {
    played: stats.played + 1,
    won: stats.won + 1,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    wins: stats.wins.map((n, i) => (i === round.step ? n + 1 : n)),
  };
}

/** Accepts whatever came out of storage and returns valid Stats. */
export function parseStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return EMPTY_STATS;
  const r = raw as Record<string, unknown>;
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const wins = Array.isArray(r.wins) ? r.wins : [];
  return {
    played: count(r.played),
    won: count(r.won),
    streak: count(r.streak),
    bestStreak: count(r.bestStreak),
    wins: CLIP_STEPS.map((_, i) => count(wins[i])),
  };
}
