// Sista server: WhatsApp webhook + team console + site dashboards.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getConfig, loadDotEnv } from './config.js';
import { openDb } from './db.js';
import { makeWhatsAppSender, verifySignature, parseIncoming } from './whatsapp.js';
import { makeService } from './service.js';
import { makeAuth } from './auth.js';
import { siteSummary } from '../src/analytics.js';
import { userRef } from './crypto.js';
import { makeAnthropicCompanion } from './ai.js';

const here = dirname(fileURLToPath(import.meta.url));
const page = (name) => join(here, 'public', name);
const OUTCOMES = ['resolved', 'referred_clinician', 'referred_service', 'no_answer', 'other'];

export function createApp({ cfg, db, sender, companion = null, log = console }) {
  const service = makeService({ db, sender, cfg, companion, log });
  const auth = makeAuth({ db, cfg });
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // ---------- WhatsApp webhook ----------
  app.get('/webhook', (req, res) => {
    const ok = req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === cfg.whatsapp.verifyToken;
    log.info?.(ok ? 'Webhook verified by Meta.' : 'Webhook verification refused: WA_VERIFY_TOKEN does not match.');
    res.status(ok ? 200 : 403).send(ok ? req.query['hub.challenge'] : 'forbidden');
  });
  app.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    if (!verifySignature(req.body, req.get('x-hub-signature-256'), cfg.whatsapp.appSecret)) {
      log.error?.('Webhook refused: invalid signature. Check that WA_APP_SECRET is the secret of the same Meta app.');
      return res.sendStatus(401);
    }
    res.sendStatus(200); // answer Meta at once, then process
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); } catch { return; }
    const incoming = parseIncoming(payload);
    log.info?.(`Webhook received: ${incoming.length} message(s)`);
    (async () => {
      for (const m of incoming) {
        try { await service.handleIncoming(m); } catch (err) { log.error?.(`handleIncoming: ${err.stack}`); }
      }
    })();
  });

  app.use(express.json({ limit: '50kb' }));
  app.use(auth.identify);
  app.use('/static', express.static(join(here, 'public', 'static'), { maxAge: '1h' }));

  // ---------- Pages ----------
  app.get('/', (req, res) => res.redirect(req.staff?.role === 'site_viewer' ? '/dashboard' : '/console'));
  app.get('/login', (_req, res) => res.sendFile(page('login.html')));
  app.get('/console', auth.requirePage('admin', 'clinician', 'referent'), (_req, res) => res.sendFile(page('console.html')));
  app.get('/dashboard', auth.requirePage('admin', 'clinician', 'referent', 'site_viewer'), (_req, res) => res.sendFile(page('dashboard.html')));
  app.get('/favicon.ico', (_req, res) => res.sendStatus(204));
  app.get('/health', (_req, res) => res.json({ ok: true, dryRun: !!sender.dryRun, ai: !!companion }));

  // ---------- Auth API ----------
  app.post('/api/login', auth.login);
  app.post('/api/logout', auth.logout);
  app.get('/api/me', auth.requireRole('admin', 'clinician', 'referent', 'site_viewer'), (req, res) => res.json(req.staff));

  // ---------- Cases API (team console) ----------
  const team = auth.requireRole('admin', 'clinician', 'referent');
  // Referents only see cases from their own site; clinicians and admins see all.
  const scopeSite = (staff) => (staff.role === 'referent' ? staff.site : null);
  const canSee = (staff, c) => c && (staff.role !== 'referent' || c.site === staff.site);

  app.get('/api/cases', team, (req, res) => {
    const statuses = req.query.status === 'closed' ? ['closed'] : ['open', 'claimed'];
    const rows = db.listCases({ statuses, site: scopeSite(req.staff) });
    res.json(rows.map((c) => ({
      id: c.id, site: c.site, priority: c.priority, category: c.category, status: c.status,
      claimedBy: c.claimed_by_name, mine: c.claimed_by === req.staff.id, createdAt: c.created_at,
      closedAt: c.closed_at, outcome: c.outcome, hoursSinceUser: c.hours_since_user,
    })));
  });
  app.get('/api/cases/:id', team, (req, res) => {
    const c = db.getCase(Number(req.params.id));
    if (!canSee(req.staff, c)) return res.status(404).json({ error: 'Cas introuvable.' });
    db.audit(req.staff.id, 'case:view', c.id);
    const s = db.getSession(c.user_ref);
    res.json({
      id: c.id, site: c.site, priority: c.priority, category: c.category, status: c.status, outcome: c.outcome,
      createdAt: c.created_at, lang: s?.lang || 'fr', lastMood: s?.last_mood ?? null,
      hoursSinceUser: s ? s.idle_hours : null, messages: service.caseMessages(c.id),
    });
  });
  app.post('/api/cases/:id/claim', team, (req, res) => {
    const c = db.getCase(Number(req.params.id));
    if (!canSee(req.staff, c)) return res.status(404).json({ error: 'Cas introuvable.' });
    res.json({ ok: service.claim(c.id, req.staff) });
  });
  app.post('/api/cases/:id/reply', team, async (req, res) => {
    const c = db.getCase(Number(req.params.id));
    if (!canSee(req.staff, c)) return res.status(404).json({ error: 'Cas introuvable.' });
    const body = String(req.body?.body || '').trim().slice(0, 3000);
    if (!body) return res.status(400).json({ error: 'Message vide.' });
    res.json(await service.staffReply(c.id, req.staff, body));
  });
  app.post('/api/cases/:id/close', team, async (req, res) => {
    const c = db.getCase(Number(req.params.id));
    if (!canSee(req.staff, c)) return res.status(404).json({ error: 'Cas introuvable.' });
    const outcome = OUTCOMES.includes(req.body?.outcome) ? req.body.outcome : 'other';
    res.json(await service.close(c.id, req.staff, outcome));
  });

  // ---------- Dashboard API ----------
  app.get('/api/sites', auth.requireRole('admin', 'clinician', 'referent', 'site_viewer'), (req, res) => {
    const all = db.listSites();
    res.json(['admin', 'clinician'].includes(req.staff.role) ? all : all.filter((s) => s.code === req.staff.site));
  });
  app.get('/api/dashboard/:site', auth.requireRole('admin', 'clinician', 'referent', 'site_viewer'), (req, res) => {
    const code = String(req.params.site);
    if (!['admin', 'clinician'].includes(req.staff.role) && req.staff.site !== code) return res.status(403).json({ error: 'Accès non autorisé.' });
    const site = db.getSite(code);
    if (!site) return res.status(404).json({ error: 'Site introuvable.' });
    res.json({ site, summary: siteSummary(db.eventRecords(code), code) });
  });

  // ---------- Local test page (never in production) ----------
  if (!cfg.production && sender.dryRun) {
    app.get('/dev', (_req, res) => res.sendFile(page('dev.html')));
    app.post('/dev/message', async (req, res) => {
      const from = String(req.body?.from || '22600000000').replace(/\D/g, '');
      await service.handleIncoming({ from, text: String(req.body?.text || '') });
      res.json({ ok: true });
    });
    app.get('/dev/outbox', (req, res) => {
      const from = String(req.query.from || '').replace(/\D/g, '');
      res.json(sender.outbox.filter((m) => m.to === from));
    });
    app.get('/dev/ref', (req, res) => res.json({ ref: userRef(String(req.query.from || ''), cfg.hashSecret) }));
  }

  app.use((err, _req, res, _next) => {
    log.error?.(err.stack);
    res.status(500).json({ error: 'Erreur interne.' });
  });

  return { app, service };
}

export function startPurgeJob(db, cfg, log = console) {
  const run = () => {
    try { const r = db.purge(cfg.retentionDays); if (r.messagesDeleted || r.contactsErased) log.info?.('purge', r); }
    catch (err) { log.error?.(`purge failed: ${err.message}`); }
  };
  run();
  return setInterval(run, 60 * 60 * 1000);
}

// ---------- Entry point ----------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadDotEnv();
  const cfg = getConfig();
  const db = openDb(cfg.dbPath);
  const sender = makeWhatsAppSender(cfg);
  const companion = makeAnthropicCompanion(cfg);
  const { app } = createApp({ cfg, db, sender, companion });
  startPurgeJob(db, cfg);
  app.listen(cfg.port, () => {
    console.log(`Sista is running on ${cfg.publicUrl}`);
    console.log(companion ? `AI listening mode: on (${cfg.ai.model})` : 'AI listening mode: off (validated sentences only)');
    if (sender.dryRun) console.log(`WhatsApp not configured: test mode. Open ${cfg.publicUrl}/dev to chat as a user.`);
  });
}
