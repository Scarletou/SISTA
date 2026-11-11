// Sista demo: runs the REAL engine in the browser (same code as the WhatsApp bot).
import { createSession, handleMessage } from '../src/engine.js';
import { toRecord, siteSummary } from '../src/analytics.js';

const SITE = 'OUAGA-DEMO';
const $ = (s) => document.querySelector(s);
let session = createSession({ userRef: 'demo-' + Math.random().toString(16).slice(2, 8) });
const liveRecords = [];
let alertCount = 0;

// ---------- Synthetic dashboard data (clearly fake, deterministic) ----------
function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function syntheticRecords() {
  const rnd = seeded(42);
  const recs = [];
  const topicsW = [['stress', 30], ['bullying', 9], ['online', 11], ['periods', 10], ['family', 10], ['couple', 13], ['maternity', 6], ['sadness', 8], ['talk', 3]];
  const pick = () => {
    let r = rnd() * 100;
    for (const [t, w] of topicsW) { if ((r -= w) <= 0) return t; }
    return 'stress';
  };
  const start = new Date(2026, 8, 7); // site year start (Sept)
  for (let w = 0; w < 8; w++) {
    const date = new Date(start.getTime() + w * 7 * 86400000);
    const examPressure = w >= 5 ? 1 : 0; // mid-term exams in weeks 6-8
    const n = 22 + Math.floor(rnd() * 10) + examPressure * 12;
    for (let i = 0; i < n; i++) {
      recs.push(toRecord({ type: 'session_start' }, { site: SITE, date }));
      const mood = Math.max(1, Math.min(5, Math.round(3.4 - examPressure * 0.7 + (rnd() - 0.5) * 2.6)));
      recs.push(toRecord({ type: 'mood', value: mood }, { site: SITE, date }));
      let t = pick();
      if (examPressure && rnd() < 0.3) t = 'stress';
      recs.push(toRecord({ type: 'topic', topic: t }, { site: SITE, date }));
      if (rnd() < 0.08) recs.push(toRecord({ type: 'referral', accepted: true }, { site: SITE, date }));
    }
    if (w % 3 === 1) recs.push(toRecord({ type: 'crisis', level: 'concern' }, { site: SITE, date }));
  }
  return recs;
}
const baseRecords = syntheticRecords();

// ---------- Chat ----------
function fmt(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}
function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function bubble(text, who) {
  const el = document.createElement('div');
  el.className = `msg ${who}`;
  el.innerHTML = `<div class="bubble">${fmt(text)}<span class="time">${now()}</span></div>`;
  $('#thread').appendChild(el);
  $('#thread').scrollTop = $('#thread').scrollHeight;
}
function typing(on) {
  $('#typing').hidden = !on;
  $('#thread').scrollTop = $('#thread').scrollHeight;
}

async function send(text) {
  if (!text.trim()) return;
  bubble(text, 'out');
  const { replies, events, alert } = await handleMessage(session, text);
  for (const e of events) liveRecords.push(toRecord(e, { site: session.site || SITE }));
  if (alert) pushAlert(alert);
  renderDashboard();
  for (const r of replies) {
    typing(true);
    await new Promise((res) => setTimeout(res, 550));
    typing(false);
    bubble(r, 'in');
  }
}

// ---------- Alerts panel ----------
const CATEGORY_LABEL = {
  self_harm: 'Risque pour soi',
  danger: 'Danger immédiat',
  referral_request: 'Demande à parler à quelqu’un',
};
function pushAlert(alert) {
  alertCount++;
  $('#alerts-empty').hidden = true;
  const li = document.createElement('li');
  li.className = `alert ${alert.priority}`;
  li.innerHTML = `
    <div class="alert-head">
      <span class="pill ${alert.priority}">${alert.priority === 'urgent' ? 'URGENT' : 'À rappeler'}</span>
      <span class="mono">${now()}</span>
    </div>
    <div class="alert-title">${CATEGORY_LABEL[alert.category] || alert.category}</div>
    <div class="alert-meta mono">Site ${alert.site || SITE} · réf. ${alert.userRef}</div>
    <div class="alert-note">Aucun message n’est transmis. L’équipe rappelle via la passerelle WhatsApp.</div>`;
  $('#alerts').prepend(li);
  $('#alert-badge').textContent = alertCount;
  $('#alert-badge').hidden = false;
}

// ---------- Dashboard ----------
const TOPIC_LABEL = {
  stress: 'Stress, examens', bullying: 'Harcèlement', online: 'Problème en ligne',
  periods: 'Règles, corps', family: 'Famille', couple: 'Couple', maternity: 'Grossesse, bébé', sadness: 'Tristesse', talk: 'Parler à quelqu’un',
};
function num(v) { return typeof v === 'number' ? v : 0; }

function renderDashboard() {
  const s = siteSummary([...baseRecords, ...liveRecords], SITE);
  $('#kpi-sessions').textContent = s.sessions;
  $('#kpi-mood').textContent = s.averageMood?.toFixed(1) ?? '—';
  $('#kpi-low').textContent = s.lowMoodShare != null ? `${Math.round(s.lowMoodShare * 100)} %` : '—';
  $('#kpi-ref').textContent = s.referrals;

  // Topic bars
  const entries = Object.entries(s.topics).sort((a, b) => num(b[1]) - num(a[1]));
  const max = Math.max(...entries.map(([, v]) => num(v)), 1);
  $('#topics').innerHTML = entries.map(([k, v]) => `
    <div class="bar-row">
      <span class="bar-label">${TOPIC_LABEL[k] || k}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(num(v) / max) * 100}%"></span></span>
      <span class="bar-val mono">${v}</span>
    </div>`).join('');

  // Mood trend
  const weeks = Object.entries(s.moodByWeek);
  const W = 520, H = 170, pl = 34, pr = 14, pt = 14, pb = 28;
  const x = (i) => pl + (i * (W - pl - pr)) / Math.max(weeks.length - 1, 1);
  const y = (v) => pt + ((5 - v) * (H - pt - pb)) / 4;
  const pts = weeks.map(([, v], i) => `${x(i)},${y(v)}`).join(' ');
  const grid = [1, 2, 3, 4, 5].map((v) =>
    `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${pl - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join('');
  const labels = weeks.map(([w], i) => `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">S${w.split('W')[1]}</text>`).join('');
  const last = weeks.length ? weeks[weeks.length - 1][1] : null;
  const exam = weeks.length > 5 ? `<rect x="${x(5) - 10}" y="${pt}" width="${x(weeks.length - 1) - x(5) + 20}" height="${H - pt - pb}" class="exam"/><text x="${x(5) - 4}" y="${pt + 12}" class="axis exam-label">Examens</text>` : '';
  $('#trend').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Humeur moyenne par semaine, de 1 à 5">
    ${exam}${grid}
    <polygon points="${pl},${y(1)} ${pts} ${x(weeks.length - 1)},${y(1)}" class="area"/>
    <polyline points="${pts}" class="line"/>
    ${last != null ? `<circle cx="${x(weeks.length - 1)}" cy="${y(last)}" r="4.5" class="dot"/>` : ''}
    ${labels}</svg>`;
  $('#crisis-count').textContent = s.crisisAlerts;
}

// ---------- Wiring ----------
$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#input').value;
  $('#input').value = '';
  send(v);
});
document.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => send(b.dataset.say)));
$('#reset').addEventListener('click', () => {
  session = createSession({ userRef: 'demo-' + Math.random().toString(16).slice(2, 8) });
  $('#thread').innerHTML = '<div class="day">Aujourd’hui</div>';
});
document.querySelectorAll('[role=tab]').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('[role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  document.querySelectorAll('[role=tabpanel]').forEach((p) => { p.hidden = p.id !== t.getAttribute('aria-controls'); });
  if (t.getAttribute('aria-controls') === 'panel-alerts') $('#alert-badge').hidden = true;
}));

renderDashboard();
// Opening state: she has just scanned the QR code.
send('SISTA OUAGA-DEMO');
