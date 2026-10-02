import { describe, expect, it } from 'vitest';
import { norm, stripAnnotations } from './normalize';

describe('norm', () => {
  it('lowercases and removes spaces', () => {
    expect(norm('Super Star')).toBe('superstar');
  });

  it('converts full-width ASCII to half-width', () => {
    expect(norm('ＳＨＥ')).toBe('she');
  });

  it('strips Chinese and Western punctuation', () => {
    expect(norm('你，好不好？')).toBe('你好不好');
    expect(norm('「晴天」')).toBe('晴天');
    expect(norm('S.H.E')).toBe('she');
  });

  it('keeps digits and CJK characters', () => {
    expect(norm('戀曲1990')).toBe('戀曲1990');
  });

  it('removes ideographic spaces', () => {
    expect(norm('晴　天')).toBe('晴天');
  });
});

describe('stripAnnotations', () => {
  it('removes bracketed subtitles', () => {
    expect(stripAnnotations('光年之外 (電影《Passengers》中國區主題曲)')).toBe('光年之外');
    expect(stripAnnotations('小幸運（電影《我的少女時代》主題曲）')).toBe('小幸運');
  });

  it('removes dash suffixes', () => {
    expect(stripAnnotations('晴天 - Live')).toBe('晴天');
  });

  it('leaves plain titles untouched', () => {
    expect(stripAnnotations('稻香')).toBe('稻香');
  });

  it('does not treat a hyphen inside a word as a suffix', () => {
    expect(stripAnnotations('A-Lin')).toBe('A-Lin');
  });
});
