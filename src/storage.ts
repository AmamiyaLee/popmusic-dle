/* localStorage wrapper that never throws — private mode, blocked storage
 * and quota errors all degrade to "nothing saved". */

const PREFIX = 'popmusic-dle:';

export function load<T>(key: string, parse: (raw: unknown) => T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return parse(raw === null ? null : JSON.parse(raw));
  } catch {
    return parse(null);
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress just isn't kept */
  }
}

export const asStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];

export const asNumber = (fallback: number) => (raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;

export const asOneOf = <T extends string>(options: readonly T[], fallback: T) => (raw: unknown): T =>
  options.includes(raw as T) ? (raw as T) : fallback;
