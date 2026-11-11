// Staff login with server-side sessions (httpOnly cookie).
import { verifyPassword, randomToken, sha256 } from './crypto.js';

const COOKIE = 'sista_sid';
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const fails = new Map(); // key -> { count, until }

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((p) => p.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

export function makeAuth({ db, cfg }) {
  function cookieAttrs(maxAge) {
    return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${cfg.production ? '; Secure' : ''}`;
  }

  function login(req, res) {
    const { username = '', password = '' } = req.body || {};
    const key = `${req.ip}|${String(username).toLowerCase()}`;
    const f = fails.get(key);
    if (f && f.until > Date.now()) return res.status(429).json({ error: `Trop d'essais. Réessaie dans ${LOCK_MINUTES} minutes.` });
    const staff = db.getStaffByUsername(String(username).toLowerCase());
    if (!staff || !verifyPassword(password, staff.password_hash)) {
      const count = (f?.count || 0) + 1;
      fails.set(key, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MINUTES * 60000 : 0 });
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }
    fails.delete(key);
    const token = randomToken();
    db.createStaffSession(sha256(token), staff.id, 12);
    db.audit(staff.id, 'login');
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${cookieAttrs(12 * 3600)}`);
    res.json({ ok: true, role: staff.role });
  }

  function logout(req, res) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) db.deleteStaffSession(sha256(token));
    res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttrs(0)}`);
    res.json({ ok: true });
  }

  // Attaches req.staff when logged in.
  function identify(req, _res, next) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    req.staff = token ? db.getStaffBySession(sha256(token)) || null : null;
    next();
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.staff) return res.status(401).json({ error: 'Connexion requise.' });
      if (!roles.includes(req.staff.role)) return res.status(403).json({ error: 'Accès non autorisé.' });
      next();
    };
  }

  // Page guard: redirects to the login page instead of returning JSON.
  function requirePage(...roles) {
    return (req, res, next) => {
      if (req.staff && roles.includes(req.staff.role)) return next();
      res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    };
  }

  return { login, logout, identify, requireRole, requirePage };
}
