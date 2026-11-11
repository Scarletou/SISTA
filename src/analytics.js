// Anonymous analytics for the site dashboard.
// Events never contain message text, phone numbers or names.
// Small counts are suppressed (k-anonymity) so no student can be singled out.

export const MIN_CELL = 5; // counts below this are shown as "<5"

export function toRecord(event, { site, date = new Date() }) {
  return {
    site: site || 'UNKNOWN',
    week: isoWeek(date),
    type: event.type,
    topic: event.topic ?? null,
    mood: event.value ?? null,
    level: event.level ?? null,
    accepted: event.accepted ?? null,
  };
}

export function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function suppress(n) {
  return n > 0 && n < MIN_CELL ? '<5' : n;
}

// Aggregate records for one site into dashboard figures.
export function siteSummary(records, site) {
  const rows = records.filter((r) => r.site === site);
  const count = (pred) => rows.filter(pred).length;
  const topics = {};
  for (const r of rows) if (r.type === 'topic') topics[r.topic] = (topics[r.topic] || 0) + 1;
  const moods = rows.filter((r) => r.type === 'mood').map((r) => r.mood);
  const byWeek = {};
  for (const r of rows) {
    if (r.type !== 'mood') continue;
    (byWeek[r.week] ||= []).push(r.mood);
  }
  return {
    site,
    sessions: suppress(count((r) => r.type === 'session_start')),
    topics: Object.fromEntries(Object.entries(topics).map(([k, v]) => [k, suppress(v)])),
    averageMood: moods.length >= MIN_CELL ? +(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(2) : null,
    lowMoodShare: moods.length >= MIN_CELL ? +(moods.filter((m) => m <= 2).length / moods.length).toFixed(2) : null,
    moodByWeek: Object.fromEntries(
      Object.entries(byWeek)
        .filter(([, v]) => v.length >= MIN_CELL)
        .sort()
        .map(([w, v]) => [w, +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)])
    ),
    referrals: suppress(count((r) => r.type === 'referral' && r.accepted)),
    crisisAlerts: suppress(count((r) => r.type === 'crisis')),
  };
}
