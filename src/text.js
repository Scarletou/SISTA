// Text normalisation shared by the crisis detector and the intent router.
// Lowercase, strip accents and punctuation, collapse spaces.
export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True when one of the phrases appears as whole words in the normalised text.
export function containsAny(text, phrases) {
  const padded = ` ${text} `;
  return phrases.some((p) => padded.includes(` ${normalize(p)} `));
}
