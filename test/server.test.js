// End-to-end tests: real HTTP server, in-memory database, fake WhatsApp.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { createApp } from '../app/server.js';
import { openDb } from '../app/db.js';
import { makeDryRunSender } from '../app/whatsapp.js';
import { getConfig } from '../app/config.js';
import { hashPassword } from '../app/crypto.js';

const APP_SECRET = 'test-app-secret';
const cfg = getConfig({
  SISTA_DATA_KEY: randomBytes(32).toString('base64'), SISTA_SECRET: 'test-secret-1234567890',
  WA_VERIFY_TOKEN: 'verify-me', WA_APP_SECRET: APP_SECRET,
});
const quiet = { info() {}, error() {} };
let db, sender, server, base;
const PHONE = '22670000001';

before(async () => {
  db = openDb(':memory:');
  sender = makeDryRunSender(quiet);
  db.upsertSite('UJKZ', 'Campus test', 'university');
  db.upsertSite('LYC-A', 'Lycée A', 'school');
  for (const [u, role, site] of [['psy', 'clinician', null], ['ref-a', 'referent', 'LYC-A'], ['viewer', 'site_viewer', 'UJKZ']]) {
    db.createStaff({ username: u, name: `${u} Test`, role, site, passwordHash: hashPassword('pw-' + u) });
  }
  const { app } = createApp({ cfg, db, sender, log: quiet });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); db.close(); });

const tick = () => new Promise((r) => setTimeout(r, 60));

async function whatsapp(text, from = PHONE) {
  const body = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body: text } }] } }] }] });
  const sig = 'sha256=' + createHmac('sha256', APP_SECRET).update(body).digest('hex');
  const res = await fetch(`${base}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig }, body });
  assert.equal(res.status, 200);
  await tick();
}
const lastTo = (to = PHONE) => sender.outbox.filter((m) => m.to === to).at(-1)?.body || '';

async function login(username) {
  const res = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'pw-' + username }) });
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  return (path, opts = {}) => fetch(base + path, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) }, body: opts.body && JSON.stringify(opts.body) });
}

test('webhook rejects unsigned requests and verifies Meta subscription', async () => {
  const bad = await fetch(`${base}/webhook`, { method: 'POST', body: '{}', headers: { 'X-Hub-Signature-256': 'sha256=nope' } });
  assert.equal(bad.status, 401);
  const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42`);
  assert.equal(await ok.text(), '42');
});

test('a user conversation is persisted across messages', async () => {
  await whatsapp('SISTA UJKZ');
  assert.match(lastTo(), /Sista/);
  await whatsapp('oui');
  await whatsapp('2');
  await whatsapp('je suis trop stressée pour mes partiels');
  assert.match(lastTo(), /stresse le plus/);
  const events = db.eventRecords('UJKZ').map((e) => e.type);
  assert.deepEqual(events, ['session_start', 'consent', 'mood', 'topic']);
});

test('phone numbers and messages are never stored in clear', async () => {
  await whatsapp("j'ai envie de mourir");
  const dump = JSON.stringify([
    db.raw.prepare('SELECT * FROM sessions').all(),
    db.raw.prepare('SELECT * FROM case_messages').all(),
    db.raw.prepare('SELECT * FROM events').all(),
  ]);
  assert.ok(!dump.includes(PHONE));
  assert.ok(!dump.includes('mourir'));
});

test('crisis creates an urgent case visible to the clinician with the triggering words', async () => {
  const psy = await login('psy');
  const cases = await (await psy('/api/cases')).json();
  const c = cases.find((x) => x.priority === 'urgent');
  assert.ok(c);
  assert.equal(c.site, 'UJKZ');
  const detail = await (await psy(`/api/cases/${c.id}`)).json();
  assert.match(detail.messages[0].body, /mourir/);
});

test('staff reply hands over the conversation; the bot goes silent; close hands back', async () => {
  const psy = await login('psy');
  const [c] = (await (await psy('/api/cases')).json()).filter((x) => x.priority === 'urgent');
  const r = await (await psy(`/api/cases/${c.id}/reply`, { method: 'POST', body: { body: 'Bonjour, je suis là. Tu es en sécurité maintenant ?' } })).json();
  assert.equal(r.ok, true);
  assert.match(lastTo(), /psy, de l'équipe Sista/);

  const before = sender.outbox.length;
  await whatsapp('oui ça va un peu mieux');
  assert.equal(sender.outbox.length, before, 'bot must stay silent during a human conversation');
  const detail = await (await psy(`/api/cases/${c.id}`)).json();
  assert.equal(detail.status, 'claimed');
  assert.equal(detail.messages.at(-1).body, 'oui ça va un peu mieux');

  // Crisis words still trigger the fixed safety message even in human mode.
  await whatsapp('il va me tuer');
  assert.match(lastTo(), /116/);

  await psy(`/api/cases/${c.id}/close`, { method: 'POST', body: { outcome: 'referred_clinician' } });
  assert.match(lastTo(), /terminée/);
  await whatsapp('menu');
  assert.match(lastTo(), /Tu peux me parler de tout/);
});

test('referents only see their own site; site viewers cannot use the console', async () => {
  const ref = await login('ref-a');
  const cases = await (await ref('/api/cases')).json();
  assert.ok(cases.every((c) => c.site === 'LYC-A'));
  const viewer = await login('viewer');
  assert.equal((await viewer('/api/cases')).status, 403);
  assert.equal((await viewer('/api/dashboard/LYC-A')).status, 403);
  const dash = await (await viewer('/api/dashboard/UJKZ')).json();
  assert.equal(dash.site.code, 'UJKZ');
});

test('referral request from a school reaches only that school referent', async () => {
  const girl = '22670000002';
  for (const m of ['SISTA LYC-A', 'oui', 'bof', 'je veux parler à quelqu’un', 'oui']) await whatsapp(m, girl);
  const ref = await login('ref-a');
  const cases = await (await ref('/api/cases')).json();
  assert.equal(cases.length, 1);
  assert.equal(cases[0].category, 'referral_request');
});

test('login is locked after repeated failures', async () => {
  let last;
  for (let i = 0; i < 6; i++) {
    last = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'viewer', password: 'wrong' }) });
  }
  assert.equal(last.status, 429);
});

test('retention purge erases closed-case messages', async () => {
  db.raw.prepare(`UPDATE cases SET closed_at = datetime('now', '-40 days') WHERE status='closed'`).run();
  const r = db.purge(30);
  assert.ok(r.messagesDeleted > 0);
});
