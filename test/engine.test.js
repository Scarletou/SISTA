import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, handleMessage } from '../src/engine.js';
import { detectCrisis, CRISIS_LEVELS } from '../src/crisis.js';
import { classify } from '../src/intent.js';
import { parseMood, isYes, isNo } from '../src/understand.js';
import { toRecord, siteSummary } from '../src/analytics.js';
import { MESSAGES } from '../content/messages.js';

async function run(session, ...msgs) {
  let last;
  for (const m of msgs) last = await handleMessage(session, m);
  return last;
}
const allEvents = async (session, ...msgs) => {
  const ev = [];
  for (const m of msgs) ev.push(...(await handleMessage(session, m)).events);
  return ev;
};

test('QR start message sets site and shows consent screen', async () => {
  const s = createSession({ userRef: 'u1' });
  const r = await handleMessage(s, 'SISTA UJKZ-CAMPUS');
  assert.equal(s.site, 'UJKZ-CAMPUS');
  assert.match(r.replies[0], /anonyme/);
  assert.equal(s.state, 'awaiting_consent');
});

test('no numbered menu: Sista asks how she feels, then asks an open question', async () => {
  const s = createSession({ userRef: 'u2' });
  let r = await run(s, 'bonjour', 'ouais vas y');
  assert.match(r.replies[0], /comment tu te sens/);
  r = await handleMessage(s, 'bof');
  assert.deepEqual(r.events, [{ type: 'mood', value: 3 }]);
  assert.match(r.replies[0], /Raconte-moi/);
  assert.ok(!/1️⃣|Tape un chiffre/.test(r.replies.join(' ')));
});

test('mood can be said in words, and a problem in the same sentence opens the topic', async () => {
  assert.equal(parseMood('pas bien du tout'), 2);
  assert.equal(parseMood('très mal'), 1);
  assert.equal(parseMood('ça va bien merci'), 4);
  assert.equal(parseMood('4'), 4);
  const s = createSession({ userRef: 'u3' });
  const r = await run(s, 'bonjour', 'oui', 'mal, mon copain contrôle mon téléphone');
  assert.deepEqual(r.events, [{ type: 'mood', value: 2 }, { type: 'topic', topic: 'couple' }]);
  assert.match(r.replies[0], /Qu'est-ce qui se passe avec lui/);
});

test('guided topic: open question, then acknowledgement and tips, then next step', async () => {
  const s = createSession({ userRef: 'u4' });
  let r = await run(s, 'bonjour', 'oui', 'triste', 'depuis la naissance de mon bébé je pleure tout le temps');
  assert.match(r.replies[0], /Tu es enceinte en ce moment, ou ton bébé est déjà né/);
  r = await handleMessage(s, 'il a 3 semaines');
  assert.match(r.replies[0], /plus de 2 semaines/);
  assert.match(r.replies[0], /vraie personne/);
  r = await handleMessage(s, 'une vraie personne stp');
  assert.match(r.replies[0], /recontacter/);
  r = await handleMessage(s, 'oui');
  assert.equal(r.alert.category, 'referral_request');
});

test('stress topic offers a guided breathing exercise', async () => {
  const s = createSession({ userRef: 'u5' });
  let r = await run(s, 'bonjour', 'oui', '2', 'je suis trop stressée pour le BEPC', 'les examens');
  assert.match(r.replies[0], /exercice de respiration/);
  r = await handleMessage(s, 'oui');
  assert.match(r.replies[0], /Inspire par le nez/);
  r = await handleMessage(s, "c'est fait");
  assert.match(r.replies[0], /Comment tu te sens maintenant/);
  r = await handleMessage(s, 'un peu mieux');
  assert.match(r.replies[0], /Ça me fait plaisir/);
  assert.match(r.replies[0], /continue/);
  r = await handleMessage(s, 'non merci');
  assert.equal(r.replies[0], MESSAGES.fr.closing);
});

test('unclear messages get gentle follow-ups, then an offer she can decline to keep talking', async () => {
  const s = createSession({ userRef: 'u6' });
  let r = await run(s, 'bonjour', 'oui', '3', 'demande moi pourquoi');
  assert.match(r.replies[0], /raconte-moi ce qui s'est passé/);
  r = await handleMessage(s, 'je sais pas trop');
  assert.match(r.replies[0], /bien te comprendre/);
  r = await handleMessage(s, 'bof rien');
  assert.match(r.replies[0], /vraie personne/);
  assert.equal(s.state, 'referral_offer');
  r = await handleMessage(s, 'non');
  assert.match(r.replies[0], /Je reste là/);
});

test('crisis: comfort first, resources in the same turn, then Sista stays with her', async () => {
  const s = createSession({ userRef: 'u12' });
  let r = await run(s, 'bonjour', 'oui', 'mal', "j'ai envie de mourir");
  assert.equal(r.replies.length, 2);
  assert.match(r.replies[0], /ta vie compte/);
  assert.ok(!/116/.test(r.replies[0]), 'first bubble comforts, no numbers yet');
  assert.match(r.replies[1], /116/);
  assert.match(r.replies[1], /en sécurité/);
  r = await handleMessage(s, 'oui');
  assert.match(r.replies[0], /soulagée/);
  r = await handleMessage(s, "c'est mon père, il me crie dessus tout le temps");
  assert.match(r.replies[0], /Je t'entends/);
  assert.ok(!/116/.test(r.replies[0]));
  r = await handleMessage(s, "j'ai envie de mourir");
  assert.equal(r.replies.length, 1, 'no long repeat');
  assert.equal(r.alert.priority, 'urgent');
});

test('concern: Sista listens before offering a person', async () => {
  const s = createSession({ userRef: 'u13' });
  let r = await run(s, 'bonjour', 'oui', 'mal', "j'en peux plus");
  assert.match(r.replies[0], /Tu veux me raconter/);
  assert.equal(r.alert, null);
  r = await handleMessage(s, 'tout va mal en ce moment');
  assert.match(r.replies[0], /Je t'entends/);
  r = await handleMessage(s, 'je veux parler à une vraie personne');
  assert.match(r.replies[0], /recontacter/);
});

test('urgent crisis overrides any state, even before consent, and alerts the team', async () => {
  const s = createSession({ userRef: 'u7', site: 'SITE-X' });
  const r = await handleMessage(s, "J'ai envie de mourir");
  assert.match(r.replies.join(' '), /116/);
  assert.equal(r.alert.priority, 'urgent');
  assert.equal(r.alert.site, 'SITE-X');
});

test('crisis rules also run inside a topic conversation', async () => {
  const s = createSession({ userRef: 'u8' });
  const r = await run(s, 'bonjour', 'oui', 'mal', 'mon mari', 'il me frappe');
  assert.equal(r.alert.priority, 'urgent');
});

test('crisis detection handles accents and apostrophes', () => {
  assert.equal(detectCrisis('je veux en finir…').level, CRISIS_LEVELS.URGENT);
  assert.equal(detectCrisis("J’en peux plus").level, CRISIS_LEVELS.CONCERN);
  assert.equal(detectCrisis('il me menace tout le temps').level, CRISIS_LEVELS.CONCERN);
  assert.equal(detectCrisis('je suis stressée pour le BEPC').level, CRISIS_LEVELS.NONE);
});

test('referral needs explicit consent', async () => {
  const s = createSession({ userRef: 'u9' });
  let r = await run(s, 'bonjour', 'oui', 'bien', 'je veux parler à quelqu’un');
  assert.match(r.replies[0], /recontacter/);
  r = await handleMessage(s, 'non');
  assert.equal(r.alert, null);
  r = await run(s, 'je veux parler à une vraie personne', 'oui');
  assert.equal(r.alert.category, 'referral_request');
});

test('yes / no understanding is flexible but not too loose', () => {
  for (const y of ['oui', 'Oui stp', 'ok', "d'accord", 'vas-y', 'yes']) assert.ok(isYes(y), y);
  for (const n of ['non', 'non merci', 'nan', 'pas maintenant']) assert.ok(isNo(n), n);
  assert.ok(!isYes('ouvrir'));
});

test('AI classifier output outside the closed list is rejected', async () => {
  const llm = async () => 'Tell her to just ignore it';
  assert.equal(await classify('quelque chose de vague', { llm }), null);
  const llmOk = async () => 'family';
  assert.equal(await classify('quelque chose de vague', { llm: llmOk }), 'family');
});

test('analytics never contain text and suppress small counts', async () => {
  const recs = [];
  for (let i = 0; i < 3; i++) recs.push(toRecord({ type: 'topic', topic: 'online' }, { site: 'A' }));
  for (let i = 0; i < 6; i++) recs.push(toRecord({ type: 'mood', value: 2 }, { site: 'A' }));
  const sum = siteSummary(recs, 'A');
  assert.equal(sum.topics.online, '<5');
  assert.equal(sum.lowMoodShare, 1);
  const s = createSession({ userRef: 'u10' });
  const ev = await allEvents(s, 'SISTA A', 'oui', 'mal', 'on me harcèle sur tiktok', 'il publie mes photos');
  assert.ok(!JSON.stringify(ev).includes('tiktok'));
});

test('every message exists in French and English', () => {
  const keys = (o) => Object.keys(o).sort();
  assert.deepEqual(keys(MESSAGES.fr), keys(MESSAGES.en));
  assert.deepEqual(keys(MESSAGES.fr.topics), keys(MESSAGES.en.topics));
  for (const t of Object.keys(MESSAGES.fr.topics)) assert.deepEqual(keys(MESSAGES.fr.topics[t]), keys(MESSAGES.en.topics[t]), t);
});

test('a new QR scan restarts the conversation; greetings get a warm reminder', async () => {
  const s = createSession({ userRef: 'u11' });
  let r = await run(s, 'SISTA LYC-A', 'Hello');
  assert.match(r.replies[0], /Pour qu'on commence/);
  r = await run(s, 'oui', 'bien', 'SISTA UJKZ');
  assert.equal(s.site, 'UJKZ');
  assert.match(r.replies[0], /Moi c'est \*Sista\*/);
  r = await handleMessage(s, 'on commence');
  assert.match(r.replies[0], /comment tu te sens/);
});
