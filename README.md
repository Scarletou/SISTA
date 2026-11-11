# Sista

**A caring big sister in your pocket: an anonymous, clinician-validated listening space for adolescent girls and young women, reached by QR code and delivered over WhatsApp.**

Built by Aino Digital in Ouagadougou, Burkina Faso, on the technology behind SAUVIE (QR-to-WhatsApp emergency alerts, 5,000+ active users).

> **Status: v0.2, pilot-ready software.** WhatsApp integration, encrypted storage, team console and partner dashboards run today. All conversation content is a **draft pending sign-off by our clinical lead** (psychiatrist). Not yet deployed with users.

---

## The problem

In Ouagadougou, girls and young women face exam and work stress, bullying, online harassment, controlling partners, family pressure and the emotional load of pregnancy and motherhood, with almost no access to confidential, stigma-free psychological support. Asking for help in person is hard, and mental health professionals are rare.

In many West African families, an older sister is the first person a girl confides in. **Sista** recreates that trusted voice: always available, never judging, and backed by a psychiatrist.

## How Sista works

1. **Scan.** QR posters in schools, universities, health centres, workplaces and women's associations open a WhatsApp chat pre-filled with the site code. No app, no account, no name.
2. **Talk.** Sista holds a guided conversation like a big sister: she asks how she feels, invites her to say what's going on in her own words, asks a follow-up question, then shares what helps (stress at school or work, bullying, online harm, periods and body, family, partner and relationship, pregnancy and baby, sadness). No numbered menus. When Sista is not sure she understands, she offers a real person instead of guessing.
3. **Get help.** She receives short, practical guidance **written and validated by a psychiatrist**, and can ask to be called back by a trained referent or the clinician.
4. **Crisis = human.** Any message signalling self-harm or immediate danger triggers fixed helpline information (Allo 116 for under-18s, GBV helpline 80 00 12 87, police 17, fire brigade 18), opens an urgent case and notifies the on-call team.
5. **Human hand-over.** In the team console, a clinician or referent takes the case and chats with her directly on WhatsApp. The bot goes silent; crisis rules keep running.
6. **Partners see trends, never people.** Each site gets an anonymised dashboard (mood by week, topics), with counts under 5 suppressed.

## Safety by design

| Principle | Implementation |
|---|---|
| AI listens, it never decides | Optional **AI listening mode** (`src/companion.js`): a model writes short, empathic replies so she can vent, with a big-sister persona and strict instructions. Crisis detection, helplines, alerts and all advice stay deterministic and come from validated content. |
| Every AI reply is checked | `guardReply()` blocks medication, doses, self-harm methods, links, unknown phone numbers and any claim to be human. Blocked or failed replies fall back to a validated sentence. Without an API key, Sista runs on validated sentences only. |
| Crisis detection does not depend on AI | `src/crisis.js`: deterministic rules, run **first** on every message, in every state, including during human conversations. |
| Anonymity | No name, school or employer is asked. Users are identified by a keyed hash (HMAC-SHA256) of their number. |
| Encryption | Phone numbers and case messages are encrypted at rest (AES-256-GCM, `app/crypto.js`). Bot conversations are never stored on disk; the AI uses a short memory of the last messages held in RAM for 2 hours. Only messages inside a case handled by a human are kept, encrypted. In AI mode, message text (never the phone number) is sent to the model provider to generate a reply. |
| Data minimisation | Analytics events hold site, week, topic, mood score and flags only. Closed-case messages and unused numbers are erased after 30 days. |
| Least privilege | Roles: admin, clinician, referent (own site only), site viewer (own dashboard only). Every case access is logged. |
| Verified traffic | WhatsApp webhooks are checked with Meta's signature. Staff logins are rate-limited. |
| Local hosting | Designed to run on an encrypted Synology NAS in Burkina Faso (Docker), as for SAUVIE. |

See [SAFETY.md](SAFETY.md) for the protocol and open clinical questions.

## Run it

Requires Node.js 22.13+.

```bash
npm install
npm test                 # 23 tests: engine, crisis rules, WhatsApp, console, permissions, encryption
npm run setup            # creates .env with fresh secret keys
npm run admin -- add-site UJKZ "University campus" university
npm run admin -- add-user scarlett "Scarlett" admin
npm start                # http://localhost:3000
```

Without WhatsApp credentials, Sista runs in **test mode**: chat as a user at `/dev`, handle cases at `/console`, see stats at `/dashboard`.

Production deployment (WhatsApp Cloud API, Synology NAS or VPS, HTTPS): see [DEPLOY.md](DEPLOY.md) (in French).

## Repository layout

```
content/messages.js   Clinician-validated content (FR, EN; Mooré and Dioula to come)
src/                  Conversation engine, crisis rules, topic routing, analytics (no I/O)
app/server.js         HTTP server: WhatsApp webhook, console and dashboard APIs
app/service.js        Bot ↔ human hand-over, cases, on-call alerts
app/db.js             SQLite schema and queries, retention purge
app/crypto.js         AES-256-GCM, HMAC pseudonyms, scrypt passwords
app/whatsapp.js       WhatsApp Cloud API client and signature check
app/public/           Team console, site dashboard, login, local test page
scripts/              Setup and admin CLI (sites, QR codes, staff accounts)
demo/                 Standalone browser demo with synthetic data
test/                 Automated tests
```

## Roadmap (12 months)

- **M1–3** Clinical validation of all content and crisis protocol; Mooré and Dioula versions with back-translation; voice-note support.
- **M4–6** Pilot in Ouagadougou across 5 secondary schools, 1 university campus and 2 health centres; train 20 referents; on-call rota with the clinical lead.
- **M7–12** Reach 5,000 girls and young women; publish open, anonymised impact data; share the toolkit with the ministries in charge of education, health and women, and partner NGOs.

## Team

- **Scarlett**: Founder & CEO, Aino Digital (SAUVIE). Environmental engineer, YALI 2019 alumna.
- **Clinical lead**: Psychiatrist, Ouagadougou. Content validation, crisis protocols, referent training.

## License

[MIT](LICENSE). Content and code are open so that schools, NGOs and ministries can adapt Sista to their context.
