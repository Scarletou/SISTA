// Business logic shared by the WhatsApp webhook, the team console and the tests.
import { createSession, handleMessage } from '../src/engine.js';
import { detectCrisis, CRISIS_LEVELS } from '../src/crisis.js';
import { MESSAGES } from '../content/messages.js';
import { makeCipher, userRef } from './crypto.js';
import { OUTSIDE_24H } from './whatsapp.js';

const IDLE_RESET_HOURS = 12; // a new conversation after 12 h starts again with consent

const MEMORY_TTL_MS = 2 * 60 * 60 * 1000; // short-term conversation memory, RAM only, 2 h

export function makeService({ db, sender, cfg, llm = null, companion = null, log = console }) {
  const cipher = makeCipher(cfg.dataKey);
  const memories = new Map(); // userRef -> { history, topicTurns, tipsOffered, at }  (never written to disk)

  function memoryFor(ref, fresh) {
    const now = Date.now();
    for (const [k, m] of memories) if (now - m.at > MEMORY_TTL_MS) memories.delete(k);
    let m = memories.get(ref);
    if (!m || fresh) { m = { history: [], topicTurns: 0, tipsOffered: false }; memories.set(ref, m); }
    m.at = now;
    return m;
  }

  async function send(to, body) {
    try { await sender.sendText(to, body); return { ok: true }; }
    catch (err) { log.error?.(`WhatsApp send failed: ${err.message}`); return { ok: false, error: err }; }
  }

  async function notifyOncall(caseRow, reason) {
    db.audit(null, `alert:${reason}`, caseRow.id);
    const summary = `Sista: alerte ${caseRow.priority.toUpperCase()} (cas #${caseRow.id}, site ${caseRow.site || '?'}). Ouvrez la console.`;
    for (const n of cfg.oncallNumbers) {
      try {
        if (cfg.whatsapp.alertTemplate) await sender.sendTemplate(n, cfg.whatsapp.alertTemplate);
        else await sender.sendText(n, summary);
      } catch (err) { log.error?.(`On-call notification failed: ${err.message}`); }
    }
    if (cfg.alertWebhookUrl) {
      // Only the case number and site leave the server, never content.
      fetch(cfg.alertWebhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summary, caseId: caseRow.id, priority: caseRow.priority, site: caseRow.site }),
      }).catch((err) => log.error?.(`Alert webhook failed: ${err.message}`));
    }
  }

  // ---------------- Incoming message from a user ----------------
  async function handleIncoming({ from, text, unsupported }) {
    const ref = userRef(from, cfg.hashSecret);
    const row = db.getSession(ref);
    const session = row
      ? { userRef: ref, site: row.site, lang: row.lang, state: row.state, lastMood: row.last_mood,
          topic: row.topic, unknownCount: row.unknown_count ?? 0, turn: row.turn ?? 0 }
      : createSession({ userRef: ref });
    const active = db.getActiveCase(ref);
    if (row && row.idle_hours > IDLE_RESET_HOURS && !active) session.state = 'new';
    const M = () => MESSAGES[session.lang] || MESSAGES.fr;
    const save = () => db.saveSession({ ...session, contactEnc: cipher.encrypt(from) });

    if (unsupported) {
      save();
      await send(from, M().unsupported);
      return { replies: [M().unsupported] };
    }

    if (active) {
      db.addMessage(active.id, 'user', cipher.encrypt(text));
      db.touchCase(active.id);
    }

    // A team member is handling this conversation: the bot stays silent,
    // except that crisis rules keep running.
    if (active?.status === 'claimed') {
      const crisis = detectCrisis(text);
      const replies = [];
      if (crisis.level === CRISIS_LEVELS.URGENT) {
        if (active.priority !== 'urgent') {
          db.escalateCase(active.id, crisis.category);
          await notifyOncall({ ...active, priority: 'urgent' }, 'escalated');
        }
        replies.push(M().urgentShort);
        await send(from, M().urgentShort);
      }
      save();
      return { replies, caseId: active.id };
    }

    const memory = memoryFor(ref, session.state === 'new');
    const result = await handleMessage(session, text, { llm, companion, memory });
    for (const e of result.events) db.addEvent(session.site, e);

    let caseId = active?.id ?? null;
    if (result.alert) {
      if (active) {
        if (result.alert.priority === 'urgent' && active.priority !== 'urgent') {
          db.escalateCase(active.id, result.alert.category);
          await notifyOncall({ ...active, priority: 'urgent' }, 'escalated');
        }
      } else {
        caseId = db.createCase({ userRef: ref, site: session.site, priority: result.alert.priority, category: result.alert.category });
        // For a crisis, the clinician needs the words that triggered it.
        if (result.alert.priority === 'urgent') db.addMessage(caseId, 'user', cipher.encrypt(text));
        if (result.alert.priority === 'urgent') await notifyOncall(db.getCase(caseId), 'new');
        else db.audit(null, 'case:new', caseId);
      }
    }
    save();
    for (const r of result.replies) await send(from, r);
    return { replies: result.replies, caseId };
  }

  // ---------------- Team console actions ----------------
  function caseContact(caseRow) {
    const s = db.getSession(caseRow.user_ref);
    return s ? { session: s, phone: cipher.decrypt(s.contact_enc) } : { session: null, phone: null };
  }

  function claim(caseId, staff) {
    const changed = db.claimCase(caseId, staff.id).changes;
    if (changed) db.audit(staff.id, 'case:claim', caseId);
    return changed > 0;
  }

  async function staffReply(caseId, staff, body) {
    const c = db.getCase(caseId);
    if (!c || c.status === 'closed') return { ok: false, reason: 'closed' };
    const { session, phone } = caseContact(c);
    if (!phone) return { ok: false, reason: 'no_contact' };
    if (c.status === 'open') claim(caseId, staff);
    const lang = session?.lang || 'fr';
    const text = MESSAGES[lang].humanPrefix(staff.name.split(' ')[0]) + body;
    db.addMessage(caseId, 'staff', cipher.encrypt(body), staff.id);
    db.audit(staff.id, 'case:reply', caseId);
    const res = await send(phone, text);
    if (res.ok) return { ok: true };
    if (res.error?.code === OUTSIDE_24H) {
      let templateSent = false;
      if (cfg.whatsapp.reengageTemplate) {
        try { await sender.sendTemplate(phone, cfg.whatsapp.reengageTemplate, lang); templateSent = true; } catch {}
      }
      return { ok: false, reason: 'outside_24h', templateSent };
    }
    return { ok: false, reason: 'send_failed' };
  }

  async function close(caseId, staff, outcome) {
    const c = db.getCase(caseId);
    if (!c || c.status === 'closed') return { ok: false };
    db.closeCase(caseId, outcome);
    db.audit(staff.id, `case:close:${outcome}`, caseId);
    const { session, phone } = caseContact(c);
    if (session) db.raw.prepare(`UPDATE sessions SET state='listening' WHERE user_ref=?`).run(c.user_ref);
    if (phone && c.status === 'claimed') await send(phone, MESSAGES[session?.lang || 'fr'].humanClosed);
    return { ok: true };
  }

  function caseMessages(caseId) {
    return db.listMessages(caseId).map((m) => ({
      id: m.id, sender: m.sender, staffName: m.staff_name, at: m.created_at, body: cipher.decrypt(m.body_enc),
    }));
  }

  return { handleIncoming, claim, staffReply, close, caseMessages };
}
