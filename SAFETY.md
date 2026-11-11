# Safety & safeguarding protocol (draft v0.1)

This document is a **draft** to be completed and signed off by the clinical lead before any deployment with students.

## 1. What Sista is and is not

- Sista offers psychoeducation, coping tips and a path to a trusted adult.
- Sista is **not** therapy, diagnosis or an emergency service. This is stated in the first message.

## 2. Content governance

- Sista speaks as a caring big sister, but always states clearly that she is a tool, not a person.
- Every message in `content/messages.js` is written or approved by the clinical lead.
- Any change to content requires clinical sign-off (tracked in pull requests).
- Local-language versions are produced by native speakers and back-translated for review.
- **AI listening mode (optional).** When enabled, a language model writes short empathic replies so she can vent and keep talking. It never handles crisis detection, helplines, alerts or advice: those stay rule-based and come from validated content. Every AI reply goes through `guardReply()` (no medication, doses, methods, links, unknown numbers, or claims to be human) and falls back to a validated sentence if blocked.
- The AI's instructions (system prompt in `src/companion.js`) must be reviewed by the clinical lead like any other content, and a sample of anonymised AI replies should be reviewed regularly during the pilot.

## 3. Crisis handling

| Level | Triggers (examples) | Sista's response | Human action |
|---|---|---|---|
| Urgent | self-harm or suicidal intent; immediate danger from another person, including a partner | Fixed message: Allo 116 (under 18), GBV helpline 80 00 12 87, police 17, fire brigade 18, go to a trusted person | Immediate alert to on-call team, who contact her via the WhatsApp gateway |
| Concern | hopelessness, forced marriage, threats from a partner | Supportive message + offer of referral | Callback only if the student accepts |

- Crisis rules run before anything else, in every state, including before consent.
- Keyword lists are reviewed monthly from anonymised, aggregated false-positive / false-negative reviews.

## 4. Privacy

- No name, school or employer is asked. Users are identified by a keyed hash of their number.
- Phone numbers are stored **encrypted** (AES-256-GCM), only so that the team can reply. They are erased after 30 days of inactivity when no case is open.
- **Bot conversations are never stored on disk.** In AI mode, the last messages of a conversation are kept in memory (RAM) for 2 hours so Sista can follow the thread, then forgotten.
- **AI provider.** In AI mode, the text of her messages (never her phone number) is sent to the model provider to generate a reply. Before the pilot: sign the provider's data processing terms, check its rules for services used by minors, and add this processing to the CIL declaration and the privacy notice.
- Messages are kept only inside a case (crisis or callback request), encrypted, so that the person handling it has context. They are erased 30 days after the case is closed.
- Analytics: site, ISO week, topic, mood score, flags. Counts under 5 are suppressed.
- Access is role-based (clinician, referent limited to her site, site viewer limited to anonymous stats). Every case view, reply and closure is written to an audit log.
- Production hosting in Burkina Faso on an encrypted volume, declared to the national data protection authority (CIL).

## 5. Human hand-over

- When a team member replies in the console, the case is "taken" and Sista stops answering. Crisis rules keep running and still send helplines.
- Team messages are prefixed with the staff member's first name, so she knows a person is writing.
- Closing the case tells her the conversation has ended and hands back to Sista.
- After 24 h without a message from her, WhatsApp only allows an approved template inviting her to reply.

## 6. Open questions for the clinical lead

- [ ] Legal duty-of-care: when may the team break anonymity (e.g. imminent danger to a minor)?
- [ ] On-call hours and maximum response time for urgent alerts; what Sista says outside on-call hours.
- [ ] Parental information approach for minors; distinct pathways for under-18s and adults.
- [ ] Referral pathway for perinatal mental health (with maternity services).
- [ ] Safety of users living with a controlling partner (phone checks, quick exit, chat deletion advice).
- [ ] Final crisis keyword lists in French, Mooré and Dioula.
- [ ] Training curriculum for referents (teachers, campus staff, health workers).
