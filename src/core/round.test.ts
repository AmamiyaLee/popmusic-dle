import { describe, expect, it } from 'vitest';
import { CLIP_STEPS, clipSeconds, giveUp, newRound, skip, submitGuess, timelineFraction } from './round';
import { SAMPLE } from './testSongs';

const answer = SAMPLE[0]; // 稻香
const wrong = { label: '七里香', songId: 'qilixiang' };
const right = { label: '稻香', songId: 'daoxiang' };

describe('round', () => {
  it('starts at the shortest clip', () => {
    const r = newRound(answer);
    expect(r.status).toBe('playing');
    expect(clipSeconds(r)).toBe(0.1);
  });

  it('wins on a correct guess without advancing the clip', () => {
    const r = submitGuess(newRound(answer), right, SAMPLE);
    expect(r.status).toBe('won');
    expect(r.step).toBe(0);
    expect(r.attempts).toEqual([{ kind: 'guess', label: '稻香', correct: true }]);
  });

  it('unlocks a longer clip after a wrong guess', () => {
    const r = submitGuess(newRound(answer), wrong, SAMPLE);
    expect(r.status).toBe('playing');
    expect(clipSeconds(r)).toBe(0.5);
  });

  it('unlocks a longer clip after a skip', () => {
    const r = skip(newRound(answer));
    expect(clipSeconds(r)).toBe(0.5);
    expect(r.attempts).toEqual([{ kind: 'skip' }]);
  });

  it('loses after missing every clip length', () => {
    let r = newRound(answer);
    for (let i = 0; i < CLIP_STEPS.length; i++) r = skip(r);
    expect(r.status).toBe('lost');
    expect(r.attempts).toHaveLength(CLIP_STEPS.length);
    expect(clipSeconds(r)).toBe(15);
  });

  it('can still win on the last clip', () => {
    let r = newRound(answer);
    for (let i = 0; i < CLIP_STEPS.length - 1; i++) r = skip(r);
    r = submitGuess(r, right, SAMPLE);
    expect(r.status).toBe('won');
  });

  it('ignores blank guesses', () => {
    const r = newRound(answer);
    expect(submitGuess(r, { label: '   ' }, SAMPLE)).toBe(r);
  });

  it('ignores input once the round is over', () => {
    const won = submitGuess(newRound(answer), right, SAMPLE);
    expect(submitGuess(won, wrong, SAMPLE)).toBe(won);
    expect(skip(won)).toBe(won);
    expect(giveUp(won)).toBe(won);
  });

  it('gives up immediately', () => {
    expect(giveUp(newRound(answer)).status).toBe('lost');
  });

  it('maps clip lengths onto the timeline on a square-root scale', () => {
    expect(timelineFraction(0)).toBe(0);
    expect(timelineFraction(15)).toBe(1);
    expect(timelineFraction(0.1)).toBeGreaterThan(0.05);
    expect(timelineFraction(30)).toBe(1);
    expect(timelineFraction(-1)).toBe(0);
    const marks = CLIP_STEPS.map(timelineFraction);
    expect([...marks].sort((a, b) => a - b)).toEqual(marks);
  });

  it('does not mutate the previous state', () => {
    const r = newRound(answer);
    skip(r);
    submitGuess(r, wrong, SAMPLE);
    expect(r).toEqual(newRound(answer));
  });
});
