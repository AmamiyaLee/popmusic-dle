const FULLWIDTH = /[！-～]/g;
const SPACES = /[\s　]/g;
const PUNCT = /[（）()[\]【】「」『』〈〉《》、・·,，.。!！?？:：;；\-—–_'"‘’“”~～&＆/]/g;

/** Canonical form for comparing titles: half-width, lowercase, no spaces or punctuation. */
export function norm(input: string): string {
  return input
    .replace(FULLWIDTH, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(SPACES, '')
    .replace(PUNCT, '');
}

/** Drops trailing annotations like "(電影《X》主題曲)" or " - Live". */
export function stripAnnotations(title: string): string {
  return title
    .replace(/\s*[(（【[].*?[)）】\]]\s*/g, ' ')
    .replace(/\s+[-–—]\s+.*$/, '')
    .trim();
}
