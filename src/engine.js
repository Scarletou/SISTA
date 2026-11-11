// Sista conversation engine.
// A small, auditable state machine that holds a guided conversation:
// Sista asks open questions, follows up and reflects, but every sentence
// comes from /content (validated by the clinical lead). Nothing is generated.
// Crisis detection runs FIRST on every message, in every state.
import { MESSAGES } from '../content/messages.js';
import { detectCrisis, CRISIS_LEVELS } from './crisis.js';
import { classify, TOPICS } from './intent.js';
import { normalize } from './text.js';
import { parseMood, isYes, isNo, isDone, wantsPerson, wantsOther, wantsContinue } from './understand.js';

const MAX_UNKNOWN = 3; // after three unclear messages, offer a real person (she can say no and keep talking)
const CRISIS_STATES = ['urgent', 'crisis_listen'];

export function createSession({ userRef, site = null, lang = 'fr' } = {}) {
  return { userRef, site, lang, state: 'new', lastMood: null, topic: null, unknownCount: 0, turn: 0 };
}

function detectLanguage(text) {
  return /\b(hello|hi|yes|english|hey)\b/.test(text) ? 'en' : null;
}

function parseSiteCode(raw) {
  const m = String(raw || '').match(/SISTA[-\s_]+([A-Z0-9-]{2,20})/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Handle one incoming message.
 * @returns {{ replies: string[], events: object[], alert: object|null }}
 *   - replies: messages to send back (from validated content only)
 *   - events: anonymous analytics events (never contain message text)
 *   - alert:  escalation for the human on-call team, or null
 */
const MAX_HISTORY = 16;

/**
 * Optional AI listening mode:
 *   companion: async ({ history, lang, mode }) => string | null   (see src/companion.js)
 *   memory:    { history: [], topicTurns: 0, tipsOffered: false }  short-term, kept in RAM only
 */
export async function handleMessage(session, rawText, opts = {}) {
  const out = await handle(session, rawText, opts);
  if (opts.memory) {
    const h = (opts.memory.history ||= []);
    h.push({ role: 'user', text: String(rawText) });
    for (const r of out.replies) h.push({ role: 'assistant', text: r });
    if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  }
  return out;
}

async function handle(session, rawText, { llm, companion = null, memory = null } = {}) {
  const text = normalize(rawText);
  const mem = memory || { history: [] };
  mem.history ||= [];
  mem.topicTurns ||= 0;
  const out = { replies: [], events: [], alert: null };
  session.unknownCount ??= 0;
  session.turn ??= 0;

  const site = parseSiteCode(rawText);
  if (site) {
    session.site = site;
    // A new QR scan ("SISTA <CODE>") always starts a fresh conversation.
    if (!['new', 'urgent'].includes(session.state)) session.state = 'new';
  }
  if (session.state === 'new') {
    session.lang = detectLanguage(text) || session.lang;
    out.events.push({ type: 'session_start' });
  }
  const M = MESSAGES[session.lang] || MESSAGES.fr;
  const say = (...parts) => out.replies.push(parts.filter(Boolean).join('\n\n'));
  const ack = () => M.acks[session.turn++ % M.acks.length];

  const offerReferral = (prefix) => {
    say(prefix, M.referralOffer);
    session.state = 'referral_offer';
  };

  const startTopic = (topic, prefix) => {
    session.unknownCount = 0;
    out.events.push({ type: 'topic', topic });
    if (topic === 'talk') return offerReferral(prefix);
    session.topic = topic;
    say(prefix, M.topics[topic].open);
    session.state = 'topic_followup';
  };

  // AI reply (if enabled). Returns false when unavailable or blocked, so the caller falls back.
  const companionSay = async (mode, prefix) => {
    if (!companion) return false;
    const reply = await companion({
      history: [...mem.history, { role: 'user', text: String(rawText) }],
      lang: session.lang, mode,
    });
    if (!reply) return false;
    say(prefix, reply);
    return true;
  };

  // AI listening: she vents, Sista reflects and asks. Validated tips are offered once she has talked a bit.
  const companionListen = async (prefix) => {
    if (!companion) return false;
    const topic = await classify(rawText, { llm });
    if (topic && topic !== 'talk' && topic !== session.topic) {
      out.events.push({ type: 'topic', topic });
      session.topic = topic;
      mem.topicTurns = 0;
      mem.tipsOffered = false;
    }
    if (!(await companionSay('listen', prefix))) return false;
    session.unknownCount = 0;
    session.state = 'listening';
    if (session.topic && M.topics[session.topic] && !mem.tipsOffered && ++mem.topicTurns >= 3) {
      say(M.tipsOffer);
      mem.tipsOffered = true;
      session.state = 'tips_offer';
    }
    return true;
  };

  // Free listening: understand what she talks about, or ask gently for more.
  const listen = async () => {
    if (wantsPerson(rawText)) return startTopic('talk');
    if (await companionListen()) return;
    const topic = await classify(rawText, { llm });
    if (topic && TOPICS.includes(topic)) return startTopic(topic);
    if (isDone(rawText)) { say(M.closing); session.state = 'listening'; return; }
    session.unknownCount += 1;
    if (session.unknownCount >= MAX_UNKNOWN) {
      session.unknownCount = 0;
      say(M.notSure);
      session.state = 'referral_offer';
      return;
    }
    say(session.unknownCount === 1 ? M.listenPrompt : M.listenPrompt2);
    session.state = 'listening';
  };

  // 1. Crisis check — deterministic, always first, in every state.
  const crisis = detectCrisis(rawText);
  if (crisis.level === CRISIS_LEVELS.URGENT) {
    out.events.push({ type: 'crisis', level: 'urgent', category: crisis.category });
    out.alert = { priority: 'urgent', category: crisis.category, userRef: session.userRef, site: session.site };
    if (CRISIS_STATES.includes(session.state)) {
      say(M.urgentShort); // already in crisis mode: don't repeat the long message
      session.state = 'crisis_listen';
    } else {
      // Comfort first, then resources in the same turn: she may not write again.
      say(M.urgent);
      say(M.urgentResources);
      session.state = 'urgent';
    }
    return out;
  }
  if (crisis.level === CRISIS_LEVELS.CONCERN && !CRISIS_STATES.includes(session.state)) {
    out.events.push({ type: 'crisis', level: 'concern', category: crisis.category });
    say(M.concern);
    session.unknownCount = 0;
    session.state = 'concern_listen';
    return out;
  }

  // 2. Global commands
  if (['english', 'lang en'].includes(text)) { session.lang = 'en'; say(MESSAGES.en.help); session.state = 'listening'; return out; }
  if (['francais', 'lang fr'].includes(text)) { session.lang = 'fr'; say(MESSAGES.fr.help); session.state = 'listening'; return out; }
  if (['stop', 'fin', 'au revoir', 'bye'].includes(text)) { say(M.goodbye); session.state = 'new'; return out; }
  const consented = !['new', 'awaiting_consent'].includes(session.state);
  if (consented && ['menu', 'sujets', 'help', 'topics'].includes(text)) { say(M.help); session.state = 'listening'; return out; }

  // 3. Conversation
  switch (session.state) {
    case 'new':
      say(M.welcome);
      session.state = 'awaiting_consent';
      return out;

    case 'awaiting_consent':
      if (isYes(rawText)) {
        out.events.push({ type: 'consent' });
        say(M.moodAsk);
        session.state = 'mood';
      } else if (isNo(rawText)) {
        say(M.consentNeeded);
      } else {
        // Greeting or anything else: invite her again, warmly.
        say(M.consentReminder);
      }
      return out;

    case 'mood': {
      const mood = parseMood(rawText);
      let prefix = null;
      if (mood) {
        session.lastMood = mood;
        out.events.push({ type: 'mood', value: mood });
        prefix = mood <= 2 ? M.moodLow : mood === 3 ? M.moodMid : M.moodHigh;
      }
      const topic = wantsPerson(rawText) ? 'talk' : await classify(rawText, { llm });
      if (topic === 'talk') { startTopic('talk', prefix); return out; }
      // AI mode: Sista reacts to her mood in her own words (the model sees the mood question in the history).
      if (await companionListen()) return out;
      if (topic && (TOPICS.includes(topic))) { startTopic(topic, prefix); return out; }
      say(prefix, mood >= 4 ? M.openQuestionHigh : M.openQuestion);
      session.state = 'listening';
      return out;
    }

    case 'topic_followup': {
      // Her answer to the topic's open question: acknowledge, then share what helps.
      if (wantsPerson(rawText)) { startTopic('talk'); return out; }
      // Her answer reveals a more precise subject (e.g. sadness → her baby): follow her.
      const precise = await classify(rawText, { llm });
      if (precise && precise !== session.topic && TOPICS.includes(precise)) { startTopic(precise, ack()); return out; }
      const t = M.topics[session.topic] || null;
      if (!t) { await listen(); return out; }
      if (t.exerciseOffer) {
        say(ack(), t.tips, t.exerciseOffer);
        session.state = 'exercise_offer';
      } else {
        say(ack(), t.tips, M.nextStep);
        session.state = 'after_topic';
      }
      return out;
    }

    case 'exercise_offer':
      if (isYes(rawText)) { say(M.topics[session.topic].exercise); session.state = 'exercise_running'; return out; }
      if (isNo(rawText)) { say(M.nextStep); session.state = 'after_topic'; return out; }
      await listen();
      return out;

    case 'exercise_running':
      say(M.topics[session.topic]?.exerciseDone || M.nextStep);
      session.state = 'exercise_check';
      return out;

    case 'exercise_check': {
      const mood = parseMood(rawText);
      say(mood >= 4 ? M.moodHigh : M.acks[0], M.nextStep);
      session.state = 'after_topic';
      return out;
    }

    case 'after_topic':
      if (wantsPerson(rawText)) { startTopic('talk'); return out; }
      if (wantsOther(rawText)) { say(M.help); session.state = 'listening'; return out; }
      if (isDone(rawText) || isNo(rawText)) { say(M.closing); session.state = 'listening'; return out; }
      if (wantsContinue(rawText) || isYes(rawText)) { say(M.keepGoing); session.state = 'listening'; return out; }
      await listen();
      return out;

    case 'referral_offer':
      if (isYes(rawText)) {
        say(M.referralConfirmed);
        out.events.push({ type: 'referral', accepted: true });
        out.alert = { priority: 'normal', category: 'referral_request', userRef: session.userRef, site: session.site };
        session.state = 'listening';
      } else if (isNo(rawText)) {
        say(M.referralDeclined);
        out.events.push({ type: 'referral', accepted: false });
        session.state = 'listening';
      } else {
        // She keeps talking instead of answering: drop the offer and stay with her. Never repeat it.
        session.state = 'listening';
        if (await companionListen()) return out;
        say(M.stayWithYou);
      }
      return out;

    case 'tips_offer': {
      const t = M.topics[session.topic];
      if (t && isYes(rawText)) {
        if (t.exerciseOffer) { say(t.tips, t.exerciseOffer); session.state = 'exercise_offer'; }
        else { say(t.tips, M.afterTips); session.state = 'listening'; }
        return out;
      }
      if (isNo(rawText) && normalize(rawText).split(' ').length <= 3) { say(M.keepGoing); session.state = 'listening'; return out; }
      await listen();
      return out;
    }

    case 'urgent':
      // Her answer to "are you safe right now?"
      if (isYes(rawText)) say(M.safeYes);
      else if (isNo(rawText)) say(M.safeNo);
      else say(M.safeAsk);
      session.state = 'crisis_listen';
      return out;

    case 'crisis_listen':
      // Stay with her until a person from the team takes over. No menus, no topics.
      if (isNo(rawText) && normalize(rawText).split(' ').length <= 3) { say(M.safeNo); return out; }
      if (wantsPerson(rawText)) { say(M.urgentShort); return out; }
      if (await companionSay('crisis')) return out;
      say(M.crisisSupport[session.turn++ % M.crisisSupport.length]);
      return out;

    case 'concern_listen': {
      if (wantsPerson(rawText)) { startTopic('talk'); return out; }
      if (await companionSay('concern')) return out;
      const topic = await classify(rawText, { llm });
      if (topic && TOPICS.includes(topic) && topic !== 'talk') { startTopic(topic, ack()); return out; }
      const i = session.unknownCount++;
      if (i < M.concernFollow.length) { say(M.concernFollow[i]); return out; }
      session.unknownCount = 0;
      say(M.referralOffer);
      session.state = 'referral_offer';
      return out;
    }

    case 'listening':
    default:
      await listen();
      return out;
  }
}
