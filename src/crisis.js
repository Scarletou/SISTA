// Deterministic crisis detection. NO AI here, on purpose:
// a crisis signal must never depend on a probabilistic model.
// Keyword lists are DRAFTS to be reviewed by the clinical lead and
// completed with Mooré and Dioula expressions by native speakers.
import { normalize, containsAny } from './text.js';

export const CRISIS_LEVELS = { NONE: 0, CONCERN: 1, URGENT: 2 };

const URGENT = {
  // Suicidal ideation / self-harm intent
  self_harm: [
    'me suicider', 'suicide', 'me tuer', 'en finir', 'mettre fin a ma vie',
    'plus envie de vivre', 'envie de mourir', 'je veux mourir', 'me faire du mal',
    'me couper', 'kill myself', 'want to die', 'end my life', 'hurt myself',
  ],
  // Immediate danger from someone else
  danger: [
    'me frappe', 'me bat', 'il va me tuer', 'menace de me tuer',
    'on va me tuer', 'je suis en danger', 'il me force', 'on me force',
    'viol', 'violee', 'agressee', 'hits me', 'beats me', 'i am in danger', 'raped',
  ],
};

const CONCERN = {
  hopelessness: [
    'je sers a rien', 'personne ne m aime', 'je suis nulle', 'plus d espoir',
    'je n en peux plus', 'j en peux plus', 'je craque', 'tout le monde me deteste',
    'no hope', 'i can t take it', 'nobody loves me',
  ],
  forced_marriage: ['mariage force', 'on veut me marier', 'me marier de force', 'forced marriage'],
  threats: ['il me menace', 'il menace', 'j ai peur de lui', 'threatens me', 'afraid of him'],
};

export function detectCrisis(rawText) {
  const text = normalize(rawText);
  for (const [category, phrases] of Object.entries(URGENT)) {
    if (containsAny(text, phrases)) return { level: CRISIS_LEVELS.URGENT, category };
  }
  for (const [category, phrases] of Object.entries(CONCERN)) {
    if (containsAny(text, phrases)) return { level: CRISIS_LEVELS.CONCERN, category };
  }
  return { level: CRISIS_LEVELS.NONE, category: null };
}
