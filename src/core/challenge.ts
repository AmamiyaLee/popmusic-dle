/* Challenge links carry the song id in the URL. Ids are readable pinyin
 * ("daoxiang-zhoujielun"), so they are encoded to avoid spoiling the answer
 * at a glance. This is obfuscation, not security — the bank is public anyway. */

const PARAM = 'c';

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function encodeChallenge(songId: string): string {
  return toBase64Url([...songId].reverse().join(''));
}

export function decodeChallenge(code: string): string | null {
  const decoded = fromBase64Url(code);
  return decoded ? [...decoded].reverse().join('') : null;
}

export function challengeUrl(base: string, songId: string): string {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set(PARAM, encodeChallenge(songId));
  return url.toString();
}

export function readChallenge(search: string): string | null {
  const code = new URLSearchParams(search).get(PARAM);
  return code ? decodeChallenge(code) : null;
}
