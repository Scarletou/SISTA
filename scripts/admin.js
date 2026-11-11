// Admin command line: sites, QR codes, staff accounts.
// Usage: npm run admin -- <command> ...   (run without arguments for help)
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { loadDotEnv, getConfig } from '../app/config.js';
import { openDb } from '../app/db.js';
import { hashPassword } from '../app/crypto.js';

const HELP = `
Sista admin

  npm run setup                                   First-time setup (.env with secret keys)

  npm run admin -- add-site <CODE> "<Name>" <type>   Add a site and create its QR code
        type: school | university | health | workplace | association
  npm run admin -- qr <CODE>                      Recreate the QR code of a site
  npm run admin -- sites                          List sites

  npm run admin -- add-user <username> "<Full name>" <role> [SITE]
        role: admin | clinician | referent | site_viewer
        (referent and site_viewer need a SITE code)
  npm run admin -- reset-password <username>
  npm run admin -- disable-user <username>
  npm run admin -- enable-user <username>
  npm run admin -- users                          List staff accounts
  npm run admin -- purge                          Apply the data retention rules now
`;

const ROLES = ['admin', 'clinician', 'referent', 'site_viewer'];
const TYPES = ['school', 'university', 'health', 'workplace', 'association'];

function password() {
  // Readable temporary password, to change at first login.
  return randomBytes(9).toString('base64url');
}

async function makeQr(cfg, site) {
  if (!cfg.whatsapp.displayNumber) {
    console.log('⚠️  WA_DISPLAY_NUMBER is not set in .env: QR code not created.');
    return;
  }
  const link = `https://wa.me/${cfg.whatsapp.displayNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`SISTA ${site.code}`)}`;
  mkdirSync('qrcodes', { recursive: true });
  const file = `qrcodes/${site.code}.png`;
  await QRCode.toFile(file, link, { width: 1200, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#221A26', light: '#FFFFFF' } });
  console.log(`✅ QR code: ${file}\n   Link: ${link}`);
}

async function main() {
  loadDotEnv();
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === 'help') return console.log(HELP);
  const cfg = getConfig();
  const db = openDb(cfg.dbPath);

  switch (cmd) {
    case 'add-site': {
      const [code, name, type = 'school'] = args;
      if (!code || !name || !TYPES.includes(type)) return console.log(HELP);
      const CODE = code.toUpperCase();
      if (!/^[A-Z0-9-]{2,20}$/.test(CODE)) return console.log('Code: 2 to 20 letters, digits or dashes (e.g. LYC-ZINDA).');
      db.upsertSite(CODE, name, type);
      console.log(`✅ Site ${CODE} saved.`);
      await makeQr(cfg, { code: CODE });
      break;
    }
    case 'qr': {
      const site = db.getSite(String(args[0] || '').toUpperCase());
      if (!site) return console.log('Unknown site.');
      await makeQr(cfg, site);
      break;
    }
    case 'sites':
      console.table(db.listSites());
      break;
    case 'add-user': {
      const [username, name, role, site] = args;
      if (!username || !name || !ROLES.includes(role)) return console.log(HELP);
      if (['referent', 'site_viewer'].includes(role) && !db.getSite(String(site || '').toUpperCase())) {
        return console.log('This role needs an existing SITE code. Add the site first.');
      }
      const pw = password();
      db.createStaff({ username: username.toLowerCase(), name, role, site: site ? site.toUpperCase() : null, passwordHash: hashPassword(pw) });
      console.log(`✅ Account created: ${username.toLowerCase()} (${role})\n   Temporary password: ${pw}\n   Give it in person, not by message.`);
      break;
    }
    case 'reset-password': {
      const pw = password();
      const r = db.setPassword(String(args[0] || '').toLowerCase(), hashPassword(pw));
      console.log(r.changes ? `✅ New temporary password: ${pw}` : 'Unknown user.');
      break;
    }
    case 'disable-user':
    case 'enable-user': {
      const r = db.setActive(String(args[0] || '').toLowerCase(), cmd === 'enable-user');
      console.log(r.changes ? '✅ Done.' : 'Unknown user.');
      break;
    }
    case 'users':
      console.table(db.listStaff());
      break;
    case 'purge':
      console.log(db.purge(cfg.retentionDays));
      break;
    default:
      console.log(HELP);
  }
  db.close();
}

main().catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
