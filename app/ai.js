// Claude API (Anthropic) client for the listening companion.
// Only the message text of the current conversation is sent, never the phone number.
import { makeCompanion } from '../src/companion.js';

export function makeAnthropicCompanion(cfg, log = console) {
  if (!cfg.ai.apiKey) return null;
  async function callModel({ system, messages }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': cfg.ai.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: cfg.ai.model, max_tokens: 300, system, messages }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`);
    return (body.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  }
  return makeCompanion({ callModel, log });
}
