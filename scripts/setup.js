// First-time setup: creates .env with fresh secret keys (never overwrites existing values).
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

if (!existsSync('.env')) copyFileSync('.env.example', '.env');
let env = readFileSync('.env', 'utf8');
const fill = (key, value) => {
  const re = new RegExp(`^${key}=\\s*$`, 'm');
  if (re.test(env)) { env = env.replace(re, `${key}=${value}`); console.log(`✅ ${key} generated`); }
};
fill('SISTA_DATA_KEY', randomBytes(32).toString('base64'));
fill('SISTA_SECRET', randomBytes(24).toString('base64url'));
fill('WA_VERIFY_TOKEN', randomBytes(16).toString('hex'));
writeFileSync('.env', env, { mode: 0o600 });

console.log(`
.env is ready.

⚠️  Back up SISTA_DATA_KEY and SISTA_SECRET somewhere safe (password manager).
    Without them, encrypted data cannot be read and users cannot be recognised.

Next steps:
  npm run admin -- add-user scarlett "Scarlett" admin
  npm start
`);
