// WhatsApp Cloud API (Meta) client.
import { createHmac, timingSafeEqual } from 'node:crypto';

export class WhatsAppError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

// Meta error 131047: more than 24 h since the user's last message.
// Only an approved template can be sent then.
export const OUTSIDE_24H = 131047;

export function makeWhatsAppSender(cfg, log = console) {
  const { token, phoneId, apiVersion } = cfg.whatsapp;
  if (!token || !phoneId) return makeDryRunSender(log);

  async function call(payload) {
    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new WhatsAppError(body.error?.message || `HTTP ${res.status}`, body.error?.code);
    }
  }
  return {
    dryRun: false,
    sendText: (to, body) => call({ to, type: 'text', text: { body, preview_url: false } }),
    sendTemplate: (to, name, lang = 'fr') => call({ to, type: 'template', template: { name, language: { code: lang } } }),
  };
}

// Used when no WhatsApp credentials are set: messages are kept in memory
// so the local test page (/dev) and the tests can read them.
export function makeDryRunSender(log = console) {
  const outbox = [];
  return {
    dryRun: true,
    outbox,
    async sendText(to, body) { outbox.push({ to, body, at: new Date().toISOString() }); log.info?.(`[dry-run → ${to}] ${body.slice(0, 60)}…`); },
    async sendTemplate(to, name) { outbox.push({ to, body: `[template: ${name}]`, at: new Date().toISOString() }); },
  };
}

export function verifySignature(rawBody, header, appSecret) {
  if (!appSecret) return true; // dev mode only; config enforces the secret in production
  if (!header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

// Returns [{ from, text }] for every incoming text message in a webhook payload.
export function parseIncoming(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      for (const m of change.value?.messages || []) {
        if (m.type === 'text') out.push({ from: m.from, text: m.text?.body || '' });
        else if (m.type === 'button') out.push({ from: m.from, text: m.button?.text || '' });
        else if (m.type === 'interactive') out.push({ from: m.from, text: m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '' });
        else out.push({ from: m.from, text: '', unsupported: m.type });
      }
    }
  }
  return out;
}
