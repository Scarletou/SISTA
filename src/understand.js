// Small, transparent rules to understand short everyday answers
// ("oui", "bof", "c'est bon merci"...). No AI involved.
import { normalize, containsAny } from './text.js';

// Mood: a score from 1 to 5, from a number or everyday words.
// Longer phrases are checked first ("très mal" before "mal", "pas bien" before "bien").
const MOOD_WORDS = [
  ['tres tres mal', 1], ['au plus mal', 1], ['tres mal', 1], ['horrible', 1], ['very bad', 1], ['terrible', 1],
  ['pas bien', 2], ['pas trop bien', 2], ['pas top', 2], ['not good', 2], ['not well', 2],
  ['ca va bien', 4], ['tres bien', 5], ['very good', 5], ['really good', 5],
  ['super', 5], ['genial', 5], ['top', 5], ['great', 5], ['excellent', 5],
  ['mal', 2], ['triste', 2], ['fatiguee', 2], ['fatigue', 2], ['epuisee', 2], ['sad', 2], ['tired', 2], ['bad', 2],
  ['bof', 3], ['moyen', 3], ['moyennement', 3], ['comme ci comme ca', 3], ['ca va', 3], ['normal', 3], ['okay', 3], ['so so', 3],
  ['pas mieux', 2], ['not better', 2], ['mieux', 4], ['better', 4], ['calme', 4], ['calmer', 4],
  ['bien', 4], ['good', 4], ['fine', 4],
].sort((a, b) => b[0].length - a[0].length);

export function parseMood(raw) {
  const text = normalize(raw);
  const n = text.match(/^([1-5])(\s|$|\/)/);
  if (n) return Number(n[1]);
  for (const [phrase, score] of MOOD_WORDS) if (containsAny(text, [phrase])) return score;
  return null;
}

const YES = ['oui', 'ouais', 'ouii', 'ok', 'okay', 'd accord', 'dac', 'vas y', 'bien sur', 'volontiers', 'on y va', 'on commence', 'on discute', 'go', 'yes', 'yeah', 'yep', 'sure', 'parler', 'talk'];
const NO = ['non', 'nan', 'no', 'nope', 'pas maintenant', 'pas besoin', 'not now'];
const DONE = ['merci', 'c est bon', 'ca va aller', 'ca ira', 'au revoir', 'bye', 'thanks', 'thank you', 'that s all', 'non merci'];
const TALK_TO_PERSON = ['vraie personne', 'quelqu un', 'une personne', 'psychiatre', 'psychologue', 'referente', 'real person', 'someone'];
const OTHER_TOPIC = ['autre chose', 'autre sujet', 'something else', 'another topic', 'other topic'];
const CONTINUE = ['continuer', 'continue', 'en parler', 'encore', 'keep talking', 'more'];

// "starts with" for yes/no, so "oui stp" or "non merci" still count.
const startsWithAny = (text, words) => words.some((w) => text === w || text.startsWith(`${w} `));

export const isYes = (raw) => startsWithAny(normalize(raw), YES);
export const isNo = (raw) => startsWithAny(normalize(raw), NO);
export const isDone = (raw) => containsAny(normalize(raw), DONE);
export const wantsPerson = (raw) => containsAny(normalize(raw), TALK_TO_PERSON);
export const wantsOther = (raw) => containsAny(normalize(raw), OTHER_TOPIC);
export const wantsContinue = (raw) => containsAny(normalize(raw), CONTINUE);
