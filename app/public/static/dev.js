const $ = (id) => document.getElementById(id);
const sent = [];

async function refresh() {
  const from = $('from').value;
  const outbox = await (await fetch(`/dev/outbox?from=${encodeURIComponent(from)}`)).json();
  const items = [...sent.filter((m) => m.from === from).map((m) => ({ ...m, out: true })), ...outbox]
    .sort((a, b) => a.at.localeCompare(b.at));
  const t = $('thread');
  t.replaceChildren(...items.map((m) => {
    const d = document.createElement('div');
    d.className = `msg ${m.out ? 'out' : ''}`;
    // Show WhatsApp-style *bold* like the phone does (text is escaped first).
    const safe = m.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    d.innerHTML = safe.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
    return d;
  }));
  t.scrollTop = t.scrollHeight;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (!text) return;
  sent.push({ from: $('from').value, body: text, at: new Date().toISOString() });
  $('text').value = '';
  await fetch('/dev/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: $('from').value, text }) });
  refresh();
});
$('text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('form').requestSubmit(); } });
$('from').addEventListener('change', refresh);
setInterval(refresh, 3000);
refresh();
