const { LABELS, api, el, header } = window.Sista;
const $ = (id) => document.getElementById(id);
const TYPE = { school: 'Établissement scolaire', university: 'Université', health: 'Centre de santé', workplace: 'Lieu de travail', association: 'Association' };
const SVGNS = 'http://www.w3.org/2000/svg';
const num = (v) => (typeof v === 'number' ? v : 0);

function svg(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

function trend(moodByWeek) {
  const box = $('trend');
  box.replaceChildren();
  const weeks = Object.entries(moodByWeek);
  if (weeks.length < 2) { box.append(el('p', { class: 'muted' }, 'Pas encore assez de réponses pour une tendance (minimum 5 par semaine, sur 2 semaines).')); return; }
  const W = 520, H = 180, pl = 30, pr = 14, pt = 12, pb = 26;
  const x = (i) => pl + (i * (W - pl - pr)) / (weeks.length - 1);
  const y = (v) => pt + ((5 - v) * (H - pt - pb)) / 4;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Humeur moyenne par semaine, de 1 à 5' });
  for (const v of [1, 2, 3, 4, 5]) {
    s.append(svg('line', { x1: pl, x2: W - pr, y1: y(v), y2: y(v), class: 'grid' }));
    s.append(svg('text', { x: pl - 8, y: y(v) + 4, class: 'axis', 'text-anchor': 'end' }, v));
  }
  const pts = weeks.map(([, v], i) => `${x(i)},${y(v)}`).join(' ');
  s.append(svg('polygon', { points: `${pl},${y(1)} ${pts} ${x(weeks.length - 1)},${y(1)}`, class: 'area' }));
  s.append(svg('polyline', { points: pts, class: 'line' }));
  const step = Math.ceil(weeks.length / 10);
  weeks.forEach(([w], i) => { if (i % step === 0 || i === weeks.length - 1) s.append(svg('text', { x: x(i), y: H - 6, class: 'axis', 'text-anchor': 'middle' }, `S${w.split('W')[1]}`)); });
  const last = weeks[weeks.length - 1][1];
  s.append(svg('circle', { cx: x(weeks.length - 1), cy: y(last), r: 4.5, class: 'dot' }));
  box.append(s);
}

async function load(code) {
  const { site, summary: s } = await api(`/api/dashboard/${encodeURIComponent(code)}`);
  $('site-name').textContent = site.name;
  $('site-type').textContent = `${TYPE[site.type] || site.type} · code ${site.code}`;
  $('panel').hidden = false;
  $('kpi-sessions').textContent = s.sessions;
  $('kpi-mood').textContent = s.averageMood != null ? s.averageMood.toFixed(1) : '—';
  $('kpi-low').textContent = s.lowMoodShare != null ? `${Math.round(s.lowMoodShare * 100)} %` : '—';
  $('kpi-ref').textContent = s.referrals;
  $('crisis').textContent = s.crisisAlerts;

  const entries = Object.entries(s.topics).sort((a, b) => num(b[1]) - num(a[1]));
  const max = Math.max(1, ...entries.map(([, v]) => num(v)));
  const box = $('topics');
  box.replaceChildren();
  if (!entries.length) box.append(el('p', { class: 'muted' }, 'Pas encore de données.'));
  for (const [k, v] of entries) {
    const fill = el('span', { class: 'bar-fill' });
    fill.style.width = `${(num(v) / max) * 100}%`;
    box.append(el('div', { class: 'bar-row' },
      el('span', {}, LABELS.topic[k] || k), el('span', { class: 'bar-track' }, fill), el('span', { class: 'bar-val mono' }, v)));
  }
  trend(s.moodByWeek);
}

header('dashboard').then(async () => {
  const sites = await api('/api/sites');
  if (!sites.length) { $('no-site').hidden = false; return; }
  if (sites.length > 1) {
    $('picker').hidden = false;
    for (const s of sites) $('site').append(el('option', { value: s.code }, `${s.name} (${s.code})`));
    $('site').addEventListener('change', (e) => load(e.target.value));
  }
  load(sites[0].code);
});
