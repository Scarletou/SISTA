// Chat with Sista in the terminal: npm run chat
import readline from 'node:readline/promises';
import { createSession, handleMessage } from '../src/engine.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const session = createSession({ userRef: 'cli-user' });
console.log('Sista CLI — type a message (e.g. "SISTA OUAGA-DEMO"), Ctrl+C to quit.\n');
for (;;) {
  const msg = await rl.question('🧑 > ');
  const { replies, alert } = await handleMessage(session, msg);
  for (const r of replies) console.log(`\n🤖 ${r}\n`);
  if (alert) console.log(`   [ALERT → on-call team: ${JSON.stringify(alert)}]\n`);
}
