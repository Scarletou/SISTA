// Data layer. One SQLite file: easy to back up and to host on an encrypted
// volume (Synology NAS or server). Sensitive fields are also encrypted
// column by column (see crypto.js), so a leaked file alone reveals nothing.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isoWeek } from '../src/analytics.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sites (
  code TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'school',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  user_ref TEXT PRIMARY KEY, contact_enc TEXT, state TEXT NOT NULL DEFAULT 'new',
  lang TEXT NOT NULL DEFAULT 'fr', site TEXT, last_mood INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, site TEXT NOT NULL, week TEXT NOT NULL, type TEXT NOT NULL,
  topic TEXT, mood INTEGER, level TEXT, accepted INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS events_site ON events(site, week);
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_ref TEXT NOT NULL, site TEXT,
  priority TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open',
  claimed_by INTEGER, outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), claimed_at TEXT, closed_at TEXT, last_user_msg_at TEXT
);
CREATE INDEX IF NOT EXISTS cases_status ON cases(status, priority);
CREATE TABLE IF NOT EXISTS case_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, staff_id INTEGER, body_enc TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','clinician','referent','site_viewer')),
  site TEXT, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY, staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, action TEXT NOT NULL, case_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return makeRepo(db);
}

// Adds columns introduced after v0.2 to existing databases.
function migrate(db) {
  const cols = new Set(db.prepare(`PRAGMA table_info(sessions)`).all().map((c) => c.name));
  if (!cols.has('topic')) db.exec(`ALTER TABLE sessions ADD COLUMN topic TEXT`);
  if (!cols.has('unknown_count')) db.exec(`ALTER TABLE sessions ADD COLUMN unknown_count INTEGER NOT NULL DEFAULT 0`);
  if (!cols.has('turn')) db.exec(`ALTER TABLE sessions ADD COLUMN turn INTEGER NOT NULL DEFAULT 0`);
}

function makeRepo(db) {
  const q = (sql) => db.prepare(sql);
  return {
    raw: db,
    close: () => db.close(),

    // ---------- sites ----------
    upsertSite: (code, name, type) =>
      q(`INSERT INTO sites(code,name,type) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name, type=excluded.type`).run(code, name, type),
    listSites: () => q(`SELECT code, name, type FROM sites ORDER BY name`).all(),
    getSite: (code) => q(`SELECT code, name, type FROM sites WHERE code=?`).get(code),

    // ---------- sessions ----------
    getSession: (ref) => q(`SELECT *, (julianday('now') - julianday(updated_at)) * 24 AS idle_hours FROM sessions WHERE user_ref=?`).get(ref),
    saveSession: (s) =>
      q(`INSERT INTO sessions(user_ref, contact_enc, state, lang, site, last_mood, topic, unknown_count, turn, updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(user_ref) DO UPDATE SET contact_enc=excluded.contact_enc, state=excluded.state,
           lang=excluded.lang, site=excluded.site, last_mood=excluded.last_mood, topic=excluded.topic,
           unknown_count=excluded.unknown_count, turn=excluded.turn, updated_at=excluded.updated_at`)
        .run(s.userRef, s.contactEnc ?? null, s.state, s.lang, s.site ?? null, s.lastMood ?? null,
          s.topic ?? null, s.unknownCount ?? 0, s.turn ?? 0),

    // ---------- events (anonymous) ----------
    addEvent: (site, e, date = new Date()) =>
      q(`INSERT INTO events(site, week, type, topic, mood, level, accepted) VALUES(?,?,?,?,?,?,?)`).run(
        site || 'UNKNOWN', isoWeek(date), e.type, e.topic ?? null, e.value ?? null, e.level ?? null,
        e.accepted == null ? null : e.accepted ? 1 : 0),
    eventRecords: (site) =>
      q(`SELECT site, week, type, topic, mood, level, accepted FROM events WHERE site=?`).all(site)
        .map((r) => ({ ...r, accepted: r.accepted == null ? null : !!r.accepted })),

    // ---------- cases ----------
    getActiveCase: (ref) => q(`SELECT * FROM cases WHERE user_ref=? AND status != 'closed' ORDER BY id DESC LIMIT 1`).get(ref),
    getCase: (id) => q(`SELECT * FROM cases WHERE id=?`).get(id),
    createCase: (c) =>
      Number(q(`INSERT INTO cases(user_ref, site, priority, category, last_user_msg_at) VALUES(?,?,?,?,datetime('now'))`)
        .run(c.userRef, c.site ?? null, c.priority, c.category).lastInsertRowid),
    escalateCase: (id, category) => q(`UPDATE cases SET priority='urgent', category=? WHERE id=?`).run(category, id),
    touchCase: (id) => q(`UPDATE cases SET last_user_msg_at=datetime('now') WHERE id=?`).run(id),
    claimCase: (id, staffId) =>
      q(`UPDATE cases SET status='claimed', claimed_by=?, claimed_at=datetime('now') WHERE id=? AND status='open'`).run(staffId, id),
    closeCase: (id, outcome) =>
      q(`UPDATE cases SET status='closed', outcome=?, closed_at=datetime('now') WHERE id=?`).run(outcome, id),
    listCases: ({ statuses, site }) => {
      const st = statuses.map(() => '?').join(',');
      const args = [...statuses];
      let sql = `SELECT c.*, s.name AS claimed_by_name,
        (julianday('now') - julianday(c.last_user_msg_at)) * 24 AS hours_since_user
        FROM cases c LEFT JOIN staff s ON s.id = c.claimed_by WHERE c.status IN (${st})`;
      if (site) { sql += ' AND c.site = ?'; args.push(site); }
      sql += ` ORDER BY CASE c.priority WHEN 'urgent' THEN 0 ELSE 1 END, c.id DESC LIMIT 200`;
      return q(sql).all(...args);
    },
    addMessage: (caseId, sender, bodyEnc, staffId = null) =>
      q(`INSERT INTO case_messages(case_id, sender, staff_id, body_enc) VALUES(?,?,?,?)`).run(caseId, sender, staffId, bodyEnc),
    listMessages: (caseId) =>
      q(`SELECT m.id, m.sender, m.body_enc, m.created_at, s.name AS staff_name FROM case_messages m
         LEFT JOIN staff s ON s.id = m.staff_id WHERE case_id=? ORDER BY m.id`).all(caseId),

    // ---------- staff ----------
    createStaff: (u) =>
      q(`INSERT INTO staff(username, name, role, site, password_hash) VALUES(?,?,?,?,?)`).run(u.username, u.name, u.role, u.site ?? null, u.passwordHash),
    setPassword: (username, hash) => q(`UPDATE staff SET password_hash=? WHERE username=?`).run(hash, username),
    setActive: (username, active) => q(`UPDATE staff SET active=? WHERE username=?`).run(active ? 1 : 0, username),
    getStaffByUsername: (username) => q(`SELECT * FROM staff WHERE username=? AND active=1`).get(username),
    listStaff: () => q(`SELECT id, username, name, role, site, active FROM staff ORDER BY role, name`).all(),
    createStaffSession: (tokenHash, staffId, hours = 12) =>
      q(`INSERT INTO staff_sessions(token_hash, staff_id, expires_at) VALUES(?,?,datetime('now', ?))`).run(tokenHash, staffId, `+${hours} hours`),
    getStaffBySession: (tokenHash) =>
      q(`SELECT s.id, s.username, s.name, s.role, s.site FROM staff_sessions x JOIN staff s ON s.id = x.staff_id
         WHERE x.token_hash=? AND x.expires_at > datetime('now') AND s.active=1`).get(tokenHash),
    deleteStaffSession: (tokenHash) => q(`DELETE FROM staff_sessions WHERE token_hash=?`).run(tokenHash),

    // ---------- audit ----------
    audit: (staffId, action, caseId = null) => q(`INSERT INTO audit_log(staff_id, action, case_id) VALUES(?,?,?)`).run(staffId, action, caseId),

    // ---------- retention ----------
    purge(retentionDays) {
      const ago = `-${retentionDays} days`;
      const msgs = q(`DELETE FROM case_messages WHERE case_id IN
        (SELECT id FROM cases WHERE status='closed' AND closed_at < datetime('now', ?))`).run(ago).changes;
      const contacts = q(`UPDATE sessions SET contact_enc=NULL WHERE contact_enc IS NOT NULL AND updated_at < datetime('now', ?)
        AND user_ref NOT IN (SELECT user_ref FROM cases WHERE status != 'closed')`).run(ago).changes;
      q(`DELETE FROM staff_sessions WHERE expires_at < datetime('now')`).run();
      return { messagesDeleted: Number(msgs), contactsErased: Number(contacts) };
    },
  };
}
