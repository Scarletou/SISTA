// All settings come from environment variables (see .env.example).
import { readFileSync, existsSync } from 'node:fs';

// Minimal .env loader so Scarlett can run `npm start` without extra tools.
export function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  // Tolerant parsing: any line ending, invisible characters pasted from web pages, quotes.
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const rawLine of text.split(/\r\n|[\r\n\u2028\u2029]/)) {
    const line = rawLine.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/\u00A0/g, ' ').trim().replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

export function getConfig(env = process.env) {
  const cfg = {
    production: env.NODE_ENV === 'production',
    port: Number(env.PORT || 3000),
    dbPath: env.SISTA_DB_PATH || './data/sista.db',
    dataKey: env.SISTA_DATA_KEY,          // 32 bytes, base64 — encrypts phone numbers and case messages
    hashSecret: env.SISTA_SECRET,         // pseudonymises phone numbers
    retentionDays: Number(env.SISTA_RETENTION_DAYS || 30),
    publicUrl: env.SISTA_PUBLIC_URL || `http://localhost:${env.PORT || 3000}`,
    whatsapp: {
      token: env.WA_TOKEN,
      phoneId: env.WA_PHONE_ID,
      verifyToken: env.WA_VERIFY_TOKEN,
      appSecret: env.WA_APP_SECRET,       // used to check that webhooks really come from Meta
      displayNumber: env.WA_DISPLAY_NUMBER, // e.g. 22670000000, used in QR codes
      reengageTemplate: env.WA_REENGAGE_TEMPLATE, // approved template for messages after 24 h
      alertTemplate: env.WA_ALERT_TEMPLATE,       // approved template to notify on-call staff
      apiVersion: env.WA_API_VERSION || 'v20.0',
    },
    ai: {
      apiKey: env.ANTHROPIC_API_KEY || null,         // optional: enables the AI listening mode
      model: env.SISTA_AI_MODEL || 'claude-haiku-5-5',
    },
    oncallNumbers: (env.SISTA_ONCALL_NUMBERS || '').split(',').map((s) => s.trim()).filter(Boolean),
    alertWebhookUrl: env.ALERT_WEBHOOK_URL,
  };
  const missing = [];
  if (!cfg.dataKey || Buffer.from(cfg.dataKey, 'base64').length !== 32) missing.push('SISTA_DATA_KEY (32 bytes, base64)');
  if (!cfg.hashSecret || cfg.hashSecret.length < 16) missing.push('SISTA_SECRET (16+ characters)');
  if (cfg.production) {
    for (const k of ['token', 'phoneId', 'verifyToken', 'appSecret']) {
      if (!cfg.whatsapp[k]) missing.push(`WA_${k.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase()}`);
    }
  }
  if (missing.length) throw new Error(`Missing or invalid settings: ${missing.join(', ')}. Run "npm run setup".`);
  return cfg;
}
