// AI listening mode, tested with a fake model (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, handleMessage } from '../src/engine.js';
import { guardReply, toModelMessages, buildSystemPrompt, makeCompanion } from '../src/companion.js';
import { MESSAGES } from '../content/messages.js';

function setup(modelReply) {
  const calls = [];
  const callModel = async (req) => { calls.push(req); return typeof modelReply === 'function' ? modelReply(req) : modelReply; };
  const companion = makeCompanion({ callModel, log: { info() {}, error() {} } });
  const session = createSession({ userRef: 'ai' });
  const memory = { history: [] };
  const send = (t) => handleMessage(session, t, { companion, memory });
  return { calls, session, memory, send };
}

test('venting: the AI replies in its own words and remembers the conversation', async () => {
  const { calls, send } = setup("Je t'entends, ma sœur. Ça doit être dur. Qu'est-ce qui s'est passé ensuite ?");
  for (const m of ['SISTA T', 'oui', 'pas bien']) await send(m);
  const r = await send("ma meilleure amie ne me parle plus depuis hier");
  assert.equal(r.replies[0], "Je t'entends, ma sœur. Ça doit être dur. Qu'est-ce qui s'est passé ensuite ?");
  const last = calls.at(-1);
  assert.equal(last.messages.at(-1).role, 'user');
  assert.match(last.messages.at(-1).content, /meilleure amie/);
  assert.ok(last.messages.some((m) => m.role === 'assistant' && /comment tu te sens/.test(m.content)), 'earlier turns are passed as context');
  assert.match(last.system, /grande sœur/);
});

test('crisis detection still runs before the AI, which is not even called', async () => {
  const { calls, send } = setup('should not be used');
  for (const m of ['SISTA T', 'oui', 'pas bien']) await send(m);
  const before = calls.length;
  const r = await send("j'ai envie de mourir");
  assert.equal(calls.length, before);
  assert.equal(r.alert.priority, 'urgent');
  assert.match(r.replies[1], /116/);
});

test('after a crisis, the AI keeps her company with crisis instructions', async () => {
  const { calls, send } = setup("Je suis là avec toi. Respire doucement avec moi. Il y a quelqu'un près de toi ?");
  for (const m of ['SISTA T', 'oui', 'pas bien', "j'ai envie de mourir", 'oui']) await send(m);
  const r = await send("je me sens tellement seule");
  assert.match(r.replies[0], /Respire doucement/);
  assert.match(calls.at(-1).system, /L'équipe a déjà été prévenue/);
});

test('unsafe or dishonest AI replies are blocked and replaced by a validated sentence', () => {
  assert.equal(guardReply('Prends 2 comprimés de 500 mg, ça ira mieux.'), null);
  assert.equal(guardReply('Je suis une vraie personne, tu peux me faire confiance.'), null);
  assert.equal(guardReply('Appelle le 70 12 34 56, c’est mon amie.'), null);
  assert.equal(guardReply('Va sur https://exemple.com'), null);
  assert.match(guardReply('Tu peux appeler le *116* ou le 80 00 12 87, c’est gratuit.'), /116/);
  assert.equal(guardReply('**Courage** ma sœur'), '*Courage* ma sœur');
});

test('a blocked or failing AI falls back to validated sentences', async () => {
  const blocked = setup('Prends 2 comprimés de 500 mg.');
  for (const m of ['SISTA T', 'oui', 'pas bien']) await blocked.send(m);
  let r = await blocked.send('je sais pas quoi faire');
  assert.equal(r.replies[0], MESSAGES.fr.listenPrompt);

  const failing = setup(() => { throw new Error('network down'); });
  for (const m of ['SISTA T', 'oui', 'pas bien']) await failing.send(m);
  r = await failing.send('je sais pas quoi faire');
  assert.equal(r.replies[0], MESSAGES.fr.listenPrompt);
});

test('validated tips are offered only after she has talked a bit about a topic', async () => {
  const { send, session } = setup("Je comprends, raconte-moi encore.");
  for (const m of ['SISTA T', 'oui', 'pas bien']) await send(m);
  let r = await send('je suis trop stressée pour le BEPC');
  assert.equal(r.replies.length, 1);
  r = await send("j'ai peur de décevoir mes parents");
  assert.equal(r.replies.length, 1);
  r = await send('je révise mais je retiens rien');
  assert.equal(r.replies.length, 2);
  assert.match(r.replies[1], /quelques petites choses qui aident/);
  r = await send('oui');
  assert.match(r.replies[0], /Découpe tes révisions/);
  assert.equal(session.state, 'exercise_offer');
});

test('when she keeps talking instead of answering an offer, Sista never repeats it', async () => {
  const s = createSession({ userRef: 'loop' });
  for (const m of ['SISTA T', 'oui', 'bien', 'je veux parler à quelqu’un']) await handleMessage(s, m);
  const r = await handleMessage(s, 'Pourquoi tu ne veux pas parler avec moi?');
  assert.notEqual(r.replies[0], MESSAGES.fr.referralOffer);
  assert.match(r.replies[0], /je veux parler avec toi/);
});

test('conversation history is turned into a valid alternating list', () => {
  const msgs = toModelMessages([
    { role: 'assistant', text: 'Coucou' }, { role: 'user', text: 'a' }, { role: 'user', text: 'b' }, { role: 'assistant', text: 'c' },
  ]);
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant']);
  assert.equal(msgs[0].content, 'a\n\nb');
  assert.match(buildSystemPrompt('en', 'concern'), /very hard time/);
});
