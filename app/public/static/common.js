// Shared helpers for the staff pages.
window.Sista = (() => {
  const LABELS = {
    category: {
      self_harm: 'Risque pour soi', danger: 'Danger immédiat', referral_request: 'Demande de rappel',
      hopelessness: 'Détresse', forced_marriage: 'Mariage forcé', threats: 'Menaces',
    },
    status: { open: 'En attente', claimed: 'Pris en charge', closed: 'Clôturé' },
    outcome: {
      resolved: 'Résolu', referred_clinician: 'Orientée vers la psychiatre', referred_service: 'Orientée vers un service',
      no_answer: 'Pas de réponse', other: 'Autre',
    },
    topic: {
      stress: 'Stress (études, travail)', bullying: 'Harcèlement', online: 'Problème en ligne', periods: 'Règles, corps',
      family: 'Famille', couple: 'Couple', maternity: 'Grossesse, bébé', sadness: 'Tristesse', talk: 'Parler à quelqu’un',
    },
    role: { admin: 'Admin', clinician: 'Psychiatre', referent: 'Référente', site_viewer: 'Site partenaire' },
  };

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; throw new Error('auth'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }

  // SQLite dates are UTC "YYYY-MM-DD HH:MM:SS".
  function when(s) {
    if (!s) return '';
    const d = new Date(s.replace(' ', 'T') + 'Z');
    const today = new Date().toDateString() === d.toDateString();
    return today ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function header(current) {
    const me = await api('/api/me');
    document.getElementById('who-name').textContent = `${me.name} · ${LABELS.role[me.role]}${me.site ? ' · ' + me.site : ''}`;
    if (me.role === 'site_viewer') document.querySelector('[data-nav="console"]')?.remove();
    document.querySelector(`[data-nav="${current}"]`)?.setAttribute('aria-current', 'page');
    document.getElementById('logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); location.href = '/login'; });
    return me;
  }

  return { LABELS, api, el, when, header };
})();
