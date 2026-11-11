# Sista

**An AI big sister on WhatsApp that listens to girls and young women in Burkina Faso, anonymously and day or night, and connects them to a real team the moment they need it.**

Built by Aino Digital in Burkina Faso, on the technology behind SAUVIE (QR-to-WhatsApp emergency alerts, 5,000+ users, recognised by UNFPA and UNDP).

> **Status: v0.2, working prototype.** WhatsApp integration, AI listening with safety checks, red-flag alerts, encrypted storage, team console and partner dashboards run today. All conversation content and AI instructions are a **draft pending review by our clinical lead** and partner specialists. Not yet deployed with users.

---

## The problem

In Burkina Faso, girls and young women face exam and work stress, bullying, online harassment, controlling partners, family pressure and the emotional load of pregnancy and motherhood, with almost no access to confidential, stigma-free psychological support. Asking for help in person is hard, and mental health professionals are rare.

In many West African families, an older sister is the first person a girl confides in. **Sista** recreates that trusted voice: always available, never judging, and backed by a clinical team.

## How Sista works

1. **Scan.** QR posters in schools, universities, health centres, workplaces and women's associations open a WhatsApp chat pre-filled with the site code. No app, no account, no name.
2. **Talk.** Sista talks like a big sister: an AI companion lets her vent, reflects what she feels and asks gentle questions. When she is ready, Sista shares short, locally adapted advice (stress at school or work, bullying, online harm, periods and body, family, partner and relationship, pregnancy and baby, sadness). No numbered menus.
3. **Get help.** Advice comes from content **reviewed with our clinical lead**, and she can ask at any time to be contacted by a trained referent or a health professional.
4. **Red flags = human.** Red-flag keywords (self-harm, immediate danger, violence) are detected by fixed rules, not AI. Sista comforts her, asks if she is safe and shares helplines (Allo 116 for under-18s, GBV helpline 80 00 12 87, police 17, fire brigade 18), opens an urgent case and notifies the on-call team.
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

- **M1–3** Small management team; expert review by our clinical lead with psychologists, sociologists and social workers; focus groups with 40 girls and young women; partnerships with research institutes using AI for local languages; verified WhatsApp number, encrypted local hosting, data protection declaration.
- **M4–6** Pilot in Ouagadougou: 5 secondary schools, 1 university, 2 health centres; 20 trained referents; on-call rota; 1,500 users.
- **M7–9** Mooré and Dioula versions with voice notes; 15 partner sites; partnerships with ministries and NGOs.
- **M10–12** 5,000 girls and young women reached; open, anonymised impact report; sustainability model with paying partners.

## Team

- **Scarlett**: Founder & CEO, Aino Digital. Urban planner and environmental engineer, YALI 2019 alumna, creator of SAUVIE.
- **Dr Marina Ouédraogo and her medical colleagues**: clinical leads. Physician in specialist training in psychiatry; reviews content, AI instructions and crisis protocols, and trains referents.
- **Merlie Compaoré**: Project Coordinator (sales, partnerships, events).
- **Fadilatou Sankara**: Customer relations.
- **Armel Somé**: Field distribution.

## License

[MIT](LICENSE). Content and code are open so that schools, NGOs and ministries can adapt Sista to their context.
