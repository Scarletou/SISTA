const { LABELS, api, el, when, header } = window.Sista;
let view = 'open';
let currentId = null;
let knownUrgent = new Set();
let firstLoad = true;

const $ = (id) => document.getElementById(id);

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch {}
}

function caseLabel(c) { return LABELS.category[c.category] || c.category; }

async function loadList() {
  const cases = await api(`/api/cases${view === 'closed' ? '?status=closed' : ''}`);
  const box = $('cases');
  box.replaceChildren();
  if (!cases.length) box.append(el('p', { class: 'empty' }, view === 'open' ? 'Aucun cas en cours. 💛' : 'Aucun cas clôturé.'));
  for (const c of cases) {
    const status = c.status === 'claimed' ? `Pris par ${c.mine ? 'toi' : c.claimedBy}` : LABELS.status[c.status];
    box.append(el('button', {
      class: `case ${c.priority}`, type: 'button', 'aria-current': c.id === currentId ? 'true' : 'false',
      onclick: () => openCase(c.id),
    },
      el('div', { class: 'case-top' },
        el('span', { class: `pill ${c.priority === 'urgent' ? 'urgent' : c.status}` }, c.priority === 'urgent' ? 'Urgent' : LABELS.status[c.status]),
        el('span', { class: 'mono' }, `#${c.id} · ${when(c.createdAt)}`)),
      el('div', { class: 'case-title' }, caseLabel(c)),
      el('div', { class: 'case-meta' }, `${c.site || 'Site inconnu'} · ${view === 'closed' ? LABELS.outcome[c.outcome] || '' : status}`)));
  }
  if (view === 'open') {
    $('count-open').textContent = cases.length ? `(${cases.length})` : '';
    const urgent = cases.filter((c) => c.priority === 'urgent' && c.status === 'open');
    const fresh = urgent.filter((c) => !knownUrgent.has(c.id));
    if (fresh.length && !firstLoad) beep();
    knownUrgent = new Set(urgent.map((c) => c.id));
    document.title = urgent.length ? `(${urgent.length}) URGENT · Sista` : 'Sista · Console';
    firstLoad = false;
  }
}

async function openCase(id) {
  currentId = id;
  const c = await api(`/api/cases/${id}`);
  $('placeholder').hidden = true;
  $('case').hidden = false;
  $('c-title').textContent = `#${c.id} · ${caseLabel(c)}`;
  $('c-status').replaceChildren(el('span', { class: `pill ${c.priority === 'urgent' ? 'urgent' : c.status}` }, c.priority === 'urgent' ? `Urgent · ${LABELS.status[c.status]}` : LABELS.status[c.status]));
  $('c-site').textContent = `Site : ${c.site || 'inconnu'}`;
  $('c-created').textContent = `Ouvert : ${when(c.createdAt)}`;
  $('c-mood').textContent = c.lastMood ? `Dernière humeur : ${c.lastMood}/5` : '';
  $('c-lang').textContent = `Langue : ${c.lang.toUpperCase()}`;

  const closed = c.status === 'closed';
  $('claim').hidden = c.status !== 'open';
  $('close').hidden = closed; $('outcome').hidden = closed;
  $('composer').hidden = closed;

  const n = $('window-notice');
  if (!closed && c.hoursSinceUser != null && c.hoursSinceUser > 23) {
    n.textContent = 'Son dernier message date de plus de 24 h : WhatsApp ne permet plus d’écrire librement. Un message modèle lui sera envoyé pour l’inviter à répondre.';
    n.hidden = false;
  } else n.hidden = true;

  const t = $('thread');
  t.replaceChildren();
  if (!c.messages.length) t.append(el('p', { class: 'placeholder' }, 'Pas encore de message dans ce cas. Les messages qu’elle envoie à partir de maintenant apparaîtront ici.'));
  for (const m of c.messages) {
    t.append(el('div', { class: `msg ${m.sender}` }, m.body,
      el('span', { class: 'meta' }, `${m.sender === 'staff' ? m.staffName || 'Équipe' : 'Elle'} · ${when(m.at)}`)));
  }
  t.scrollTop = t.scrollHeight;
  document.querySelectorAll('.case').forEach((b) => b.setAttribute('aria-current', 'false'));
  loadList();
}

$('claim').addEventListener('click', async () => {
  await api(`/api/cases/${currentId}/claim`, { method: 'POST' });
  await openCase(currentId);
});

$('close').addEventListener('click', async () => {
  const b = $('close');
  if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Confirmer la clôture'; b.classList.add('danger'); return; }
  b.dataset.confirm = ''; b.textContent = 'Clôturer'; b.classList.remove('danger');
  await api(`/api/cases/${currentId}/close`, { method: 'POST', body: { outcome: $('outcome').value } });
  await openCase(currentId);
});

$('composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = $('reply').value.trim();
  if (!body) return;
  $('send').disabled = true;
  try {
    const r = await api(`/api/cases/${currentId}/reply`, { method: 'POST', body: { body } });
    if (r.ok) $('reply').value = '';
    else if (r.reason === 'outside_24h') alertBox(r.templateSent
      ? 'Plus de 24 h depuis son dernier message : un message modèle l’invite à répondre. Ton message est gardé ici.'
      : 'Plus de 24 h depuis son dernier message et aucun modèle WhatsApp n’est configuré : impossible de lui écrire pour l’instant.');
    else if (r.reason === 'no_contact') alertBox('Son numéro a été effacé (règle de conservation). Impossible de la recontacter.');
    else alertBox('L’envoi a échoué. Vérifie la connexion du serveur à WhatsApp.');
    await openCase(currentId);
  } finally { $('send').disabled = false; }
});

function alertBox(text) { const n = $('window-notice'); n.textContent = text; n.hidden = false; }

for (const [id, v] of [['tab-open', 'open'], ['tab-closed', 'closed']]) {
  $(id).addEventListener('click', () => {
    view = v;
    $('tab-open').setAttribute('aria-pressed', String(v === 'open'));
    $('tab-closed').setAttribute('aria-pressed', String(v === 'closed'));
    loadList();
  });
}

header('console').then(() => {
  loadList();
  setInterval(() => { loadList().catch(() => {}); if (currentId && $('reply').value === '') openCase(currentId).catch(() => {}); }, 10000);
});
