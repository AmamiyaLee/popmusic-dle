import { describe, expect, it } from 'vitest';
import { challengeUrl, decodeChallenge, encodeChallenge, readChallenge } from './challenge';

describe('challenge links', () => {
  it('round-trips a song id', () => {
    const id = 'daoxiang-zhoujielun';
    expect(decodeChallenge(encodeChallenge(id))).toBe(id);
  });

  it('does not expose the id in plain text', () => {
    expect(encodeChallenge('daoxiang-zhoujielun')).not.toContain('daoxiang');
  });

  it('produces URL-safe codes', () => {
    expect(encodeChallenge('???>>>~~~')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns null for malformed codes', () => {
    expect(decodeChallenge('%%%')).toBeNull();
  });

  it('builds and reads a challenge URL, dropping other params', () => {
    const url = challengeUrl('https://example.com/game/?x=1#top', 'qingtian-zhoujielun');
    expect(url).toMatch(/^https:\/\/example\.com\/game\/\?c=/);
    expect(readChallenge(new URL(url).search)).toBe('qingtian-zhoujielun');
  });

  it('reads nothing when there is no challenge', () => {
    expect(readChallenge('?x=1')).toBeNull();
  });
});
