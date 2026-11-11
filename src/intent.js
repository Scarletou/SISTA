// Intent routing. The AI (optional) only CLASSIFIES a message into a
// closed list of topics; it never writes the answer. All answers come
// from clinician-validated content in /content.
import { normalize, containsAny } from './text.js';

export const TOPICS = ['stress', 'bullying', 'online', 'periods', 'family', 'couple', 'maternity', 'sadness', 'talk'];

const KEYWORDS = {
  stress: ['stress', 'stressee', 'examen', 'examens', 'cep', 'bepc', 'bac', 'concours', 'fac', 'universite', 'devoir', 'notes', 'partiel', 'partiels', 'memoire', 'travail', 'boulot', 'patron', 'chomage', 'angoisse', 'peur', 'exam', 'job', 'anxious'],
  bullying: ['harcele', 'harcelement', 'moque', 'moquent', 'insulte', 'insultent', 'bully', 'bullied'],
  online: ['facebook', 'tiktok', 'instagram', 'photo', 'photos', 'video', 'en ligne', 'internet', 'chantage', 'orange money', 'moov money', 'online'],
  periods: ['regles', 'regle', 'menstruation', 'serviette', 'serviettes', 'mal au ventre', 'corps', 'period', 'periods'],
  family: ['parents', 'papa', 'maman', 'famille', 'maison', 'tante', 'oncle', 'belle mere', 'belle famille', 'mariage', 'coepouse', 'family'],
  couple: ['copain', 'mon homme', 'mari', 'fiance', 'partenaire', 'couple', 'jaloux', 'controle mon telephone', 'boyfriend', 'husband', 'partner'],
  maternity: ['enceinte', 'grossesse', 'bebe', 'accouchement', 'naissance', 'allaitement', 'pregnant', 'baby'],
  sadness: ['triste', 'tristesse', 'pleure', 'pleurer', 'seule', 'solitude', 'deprime', 'sad', 'lonely'],
  talk: ['parler', 'quelqu un', 'psychologue', 'aide', 'talk', 'someone'],
};

export function classifyByKeywords(rawText) {
  const text = normalize(rawText);
  for (const topic of TOPICS) {
    if (containsAny(text, KEYWORDS[topic])) return topic;
  }
  return null;
}

// Optional AI classifier. `llm` is any async function (prompt) => string.
// Its output is accepted ONLY if it is exactly one of TOPICS.
export async function classify(rawText, { llm } = {}) {
  const byKeywords = classifyByKeywords(rawText);
  if (byKeywords || !llm) return byKeywords;
  try {
    const prompt =
      `Classify this message from a girl or young woman into exactly one label: ${TOPICS.join(', ')}, none.\n` +
      `Reply with the label only.\nMessage: """${String(rawText).slice(0, 500)}"""`;
    const label = normalize(await llm(prompt));
    return TOPICS.includes(label) ? label : null;
  } catch {
    return null; // AI failure falls back to the menu, never to free text
  }
}
