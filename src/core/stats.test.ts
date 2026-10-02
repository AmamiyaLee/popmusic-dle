import { describe, expect, it } from 'vitest';
import { newRound, skip, submitGuess } from './round';
import { EMPTY_STATS, parseStats, recordRound } from './stats';
import { SAMPLE } from './testSongs';

const answer = SAMPLE[0];
const winAt = (step: number) => {
  let r = newRound(answer);
  for (let i = 0; i < step; i++) r = skip(r);
  return submitGuess(r, { label: '稻香', songId: 'daoxiang' }, SAMPLE);
};
const lose = () => [0, 1, 2, 3, 4].reduce(r => skip(r), newRound(answer));

describe('recordRound', () => {
  it('ignores unfinished rounds', () => {
    expect(recordRound(EMPTY_STATS, newRound(answer))).toBe(EMPTY_STATS);
  });

  it('counts a win at the step it happened', () => {
    const s = recordRound(EMPTY_STATS, winAt(2));
    expect(s).toEqual({ played: 1, won: 1, streak: 1, bestStreak: 1, wins: [0, 0, 1, 0, 0] });
  });

  it('builds and resets streaks, keeping the best', () => {
    let s = EMPTY_STATS;
    s = recordRound(s, winAt(0));
    s = recordRound(s, winAt(1));
    s = recordRound(s, lose());
    s = recordRound(s, winAt(0));
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
    expect(s.played).toBe(4);
    expect(s.won).toBe(3);
  });
});

describe('parseStats', () => {
  it('returns empty stats for garbage', () => {
    expect(parseStats(null)).toEqual(EMPTY_STATS);
    expect(parseStats('x')).toEqual(EMPTY_STATS);
  });

  it('round-trips valid stats', () => {
    const s = recordRound(EMPTY_STATS, winAt(3));
    expect(parseStats(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('repairs bad fields', () => {
    expect(parseStats({ played: -3, won: 'a', streak: 2.7, wins: [1, null] })).toEqual({
      played: 0, won: 0, streak: 2, bestStreak: 0, wins: [1, 0, 0, 0, 0],
    });
  });
});
