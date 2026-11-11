// ⚠️ DRAFT CONTENT — every message below must be reviewed and signed off
// by the clinical lead (psychiatrist) before any use with real users.
// Voice: Sista is a caring big sister. Warm, simple, never judging.
// She asks open questions and follows up, like a real conversation,
// but every sentence is written here in advance — nothing is generated.
// Mooré and Dioula versions are to be produced by native speakers and
// back-translated for clinical validation.

export const HELPLINES = {
  // Verify all numbers before deployment.
  childHelpline: '116',        // Allo 116, free helpline for under-18s (Burkina Faso)
  gbvHelpline: '80 00 12 87',  // free GBV helpline, Ministry in charge of women (Burkina Faso)
  police: '17',
  fireBrigade: '18',
};

export const MESSAGES = {
  fr: {
    welcome:
      "Coucou ma sœur 👋 Moi c'est *Sista*, ta grande sœur toujours là pour t'écouter.\n\n" +
      "🔒 Ici c'est *anonyme* : pas besoin de me dire ton nom, ni ton école, ni ton travail.\n" +
      "🧑‍⚕️ Mes conseils sont accompagnés par des professionnels de la santé.\n" +
      "🤝 Je suis une assistante automatique, mais tu n'es pas seule : une vraie équipe est derrière moi, prête à prendre le relais si tu en as besoin.\n" +
      "🚨 Si tu es en danger, appelle le *116* (moins de 18 ans) ou le *80 00 12 87* (gratuit).\n\n" +
      "On discute ? Réponds *oui* 🙂",
    consentNeeded: "Pas de souci, je ne bouge pas 💛 Écris *oui* quand tu veux qu'on discute. Si tu es en danger : *116* ou *80 00 12 87*.",
    consentReminder: "Coucou ma sœur 👋 Pour qu'on commence à discuter, réponds simplement *oui* 🙂 Et si tu es en danger : *116* ou *80 00 12 87*.",

    moodAsk: "Super 🙂 Dis-moi, comment tu te sens aujourd'hui ? Un mot suffit, ou une note de 1 (très mal) à 5 (très bien).",
    moodLow: "Merci de me le dire, ça demande du courage. On est ensemble.",
    moodMid: "D'accord, merci de me le dire.",
    moodHigh: "Ça me fait plaisir 😊",
    openQuestion: "Qu'est-ce qui se passe pour toi en ce moment ? Raconte-moi avec tes mots, je t'écoute.",
    openQuestionHigh: "Tu avais envie de parler de quelque chose ? Raconte-moi, je t'écoute.",

    listenPrompt: "Je t'écoute 💛 Prends ton temps, raconte-moi ce qui s'est passé. Je suis là, je ne te juge pas.",
    listenPrompt2:
      "Je veux être sûre de bien te comprendre, ma sœur 🙏 C'est plutôt à l'école, à la fac ou au travail ? " +
      "À la maison ou avec la famille ? Avec ton copain ou ton mari ? Sur WhatsApp, Facebook ou TikTok ? Avec ton corps ? " +
      "Raconte-moi comme ça vient, il n'y a pas de mauvaise façon de le dire.",
    notSure:
      "Je n'arrive pas encore à bien comprendre, et je ne veux pas te répondre à côté 🙏 Mais je suis toujours là.\n\n" +
      "Tu veux que je demande à une *vraie personne* de l'équipe de te recontacter ici ? Réponds *oui* ou *non*. " +
      "Si tu dis non, on continue toutes les deux.",
    help:
      "Tu peux me parler de tout ce qui te pèse : le stress du CEP, du BEPC, du BAC, des partiels ou du travail, les moqueries, " +
      "un chantage sur WhatsApp ou Facebook, ton corps et tes règles, la famille ou la belle-famille, le mariage, ton couple, " +
      "une grossesse ou ton bébé, la tristesse…\n\nDis-moi simplement ce qui se passe.",
    keepGoing: "Vas-y, je t'écoute 💛",
    stayWithYou: "Mais si, je veux parler avec toi, ma sœur 💛 Je suis là, et on continue toutes les deux. Raconte-moi.",
    tipsOffer: "Tu veux que je te partage quelques petites choses qui aident souvent dans ce genre de situation ? Ou tu préfères qu'on continue juste à parler ?",
    afterTips: "Voilà 💛 Et toi, qu'est-ce que tu en penses ? On continue à en parler ?",

    acks: ["Merci de me le dire.", "Je vois. Ce n'est pas facile, courage ma sœur.", "D'accord, je comprends mieux.", "Merci pour ta confiance, on est ensemble."],
    nextStep: "Tu veux qu'on continue à en parler, que je te mette en contact avec une *vraie personne*, ou parler d'autre chose ?",
    closing: "Avec plaisir, ma sœur 💛 Courage, ça va aller. Je suis là quand tu veux, écris-moi n'importe quand.",

    topics: {
      stress: {
        open: "Le stress, ça peut vraiment peser 😔 C'est quoi qui te stresse le plus en ce moment : le BEPC, le BAC, les partiels, le travail, l'argent, ou autre chose ?",
        tips:
          "💡 Quelques trucs qui aident beaucoup de filles :\n" +
          "• Découpe tes révisions en petits morceaux de 25 minutes, avec une pause entre chaque\n" +
          "• Révise avec une copine sérieuse : à deux, on se motive et on s'explique les leçons\n" +
          "• Si le courant coupe le soir, dors tôt et révise au lever : la tête est fraîche le matin\n" +
          "• Dors assez, même quand l'examen approche : ton cerveau retient mieux\n" +
          "• Respirer lentement calme le corps en une minute",
        exerciseOffer: "Tu veux qu'on fasse un petit exercice de respiration ensemble, maintenant ?",
        exercise:
          "Ok, on y va 🌿\n\nInstalle-toi où tu peux, même assise sur ton lit ou dans la cour. Pas besoin d'être seule.\n" +
          "• Inspire par le nez en comptant 1, 2, 3, 4\n• Souffle doucement par la bouche en comptant 1, 2, 3, 4, 5, 6\n\n" +
          "Fais-le 5 fois, tranquillement. Écris-moi quand c'est fait.",
        exerciseDone: "Bravo 👏 Tu peux le refaire dès que le stress monte, avant d'entrer en salle d'examen par exemple. Comment tu te sens maintenant ?",
      },
      bullying: {
        open: "Je suis désolée que tu vives ça. Personne n'a le droit de te faire du mal, et ce n'est *pas* de ta faute. Ça se passe où : à l'école, à la fac, au travail, dans le quartier ?",
        tips:
          "💡 Ce qui aide :\n• En parler à une personne de confiance : ta maman, une tante, une grande sœur, une enseignante, une collègue sûre\n" +
          "• Rester avec tes copines dans les moments où ça arrive\n" +
          "• Noter ce qui se passe : la date, le lieu, qui était là. Ça servira si tu décides de le signaler",
      },
      online: {
        open: "Ce qui se passe sur WhatsApp, Facebook ou TikTok peut faire très peur, je sais. Raconte-moi : quelqu'un te harcèle, te menace, ou a partagé quelque chose sur toi ?",
        tips:
          "💡 Tout de suite :\n• Ne réponds pas et n'envoie rien, ni photo ni argent\n" +
          "• Ne paie *jamais*, même par Orange Money ou Moov Money : souvent, le chantage continue après\n" +
          "• Fais des captures d'écran\n• Bloque et signale le compte\n\n" +
          "Si quelqu'un te menace avec une photo, ce n'est *pas* de ta faute. Tu n'es pas seule face à ça.",
      },
      periods: {
        open: "Tu peux tout me demander sur ton corps, sans honte 🌸 Qu'est-ce qui te préoccupe : la douleur, tes règles qui changent, les serviettes, ou autre chose ?",
        tips:
          "💡 À savoir :\n• Avoir mal au ventre pendant les règles est fréquent ; un linge chaud sur le ventre ou le repos peuvent aider\n" +
          "• Des règles un peu irrégulières, c'est courant, surtout les premières années\n" +
          "• Si tu n'as pas toujours de quoi acheter des serviettes, demande à l'infirmerie de ton école ou à une association de femmes s'il y a de l'aide\n" +
          "• Si la douleur t'empêche d'aller en cours ou au travail chaque mois, ou si quelque chose t'inquiète, va au CSPS ou parles-en à l'infirmière",
      },
      family: {
        open: "Les tensions dans la famille, ça pèse lourd 💛 C'est avec qui que c'est difficile en ce moment : tes parents, ta belle-famille, un oncle ou une tante, ton mari ?",
        tips:
          "💡 Ce qui peut aider :\n• Trouver une personne de confiance en dehors de la maison pour souffler : une tante, une grande sœur, la maman d'une copine\n" +
          "• Écrire ce que tu ressens, juste pour toi\n" +
          "• Si on te force à quelque chose (mariage, arrêter l'école, travail), appelle le *116* (moins de 18 ans) ou le *80 00 12 87*",
      },
      couple: {
        open: "Je t'écoute. Une relation doit te faire du bien. Qu'est-ce qui se passe avec lui ?",
        tips:
          "💡 Fais attention si ton copain ou ton mari :\n• fouille ton téléphone, contrôle tes sorties ou ton argent\n" +
          "• t'insulte, te rabaisse ou te fait peur\n• t'oblige à faire des choses que tu ne veux pas\n\n" +
          "Ça, ce n'est *pas* de l'amour, et ce n'est *pas* de ta faute. Garde toujours le numéro d'une personne de confiance. " +
          "Le *80 00 12 87* est gratuit et confidentiel.",
      },
      maternity: {
        open: "Être enceinte ou devenir maman, c'est beaucoup d'émotions à la fois 💛 Tu es enceinte en ce moment, ou ton bébé est déjà né ?",
        tips:
          "💡 À savoir :\n• C'est normal de ne pas toujours aller bien, même quand on aime son bébé\n" +
          "• Pleurer ou être à fleur de peau les premiers jours après la naissance est fréquent\n" +
          "• Laisse ta maman, une tante ou tes copines t'aider avec le bébé, le temps de te reposer : accepter de l'aide n'est pas une faiblesse\n" +
          "• Si la tristesse dure plus de 2 semaines, ou si tu n'arrives plus à t'occuper de toi ou du bébé, parles-en vite à la sage-femme ou au CSPS",
      },
      sadness: {
        open: "Je suis là 💛 Ça fait longtemps que tu te sens comme ça ?",
        tips:
          "💡 Des petits pas qui peuvent aider :\n• Parler à une personne que tu aimes bien, même 5 minutes\n" +
          "• Sortir un peu : marcher jusqu'au marché ou chez une copine, prendre l'air\n" +
          "• Faire une petite chose qui te plaisait avant : la musique, la couture, la cuisine, le sport…\n\n" +
          "Et si la tristesse est là presque tous les jours depuis plus de 2 semaines, ça vaut la peine d'en parler à une vraie personne.",
      },
    },

    referralOffer:
      "Je peux demander à une *référente formée* ou à une *professionnelle de santé* de l'équipe de te recontacter ici, sur WhatsApp.\n\n" +
      "🔒 Elles verront seulement ce numéro, pas nos anciens messages.\n\nTu veux ? Réponds *oui* ou *non*.",
    referralConfirmed: "C'est noté ✅ Une personne de confiance va te recontacter ici. En attendant, si tu es en danger : *116* ou *80 00 12 87*.",
    referralDeclined: "D'accord, c'est toi qui décides 💛 Je reste là. Tu veux me parler d'autre chose ?",
    concern:
      "Oh ma sœur… ce que tu vis a l'air vraiment lourd. Merci de me le confier, je sais que ce n'est pas facile 💛\n\n" +
      "Je suis là pour t'écouter, sans te juger. Tu veux me raconter ce qui se passe ?\n\n" +
      "Et si à un moment tu préfères parler à une vraie personne de l'équipe, dis-le-moi simplement, je m'en occupe.",
    concernFollow: [
      "Je t'entends, et tout ce que tu ressens est légitime 💛 Continue, je t'écoute.",
      "Merci de me faire confiance. Tu n'as pas à porter tout ça seule. Qu'est-ce qui te pèse le plus en ce moment ?",
      "Je suis toujours là. Et quand tu voudras, je peux demander à quelqu'un de l'équipe de te parler : dis juste *une vraie personne*.",
    ],

    // Crisis: comfort first, then resources in the SAME turn (she may not write again), then stay with her.
    urgent:
      "Ma sœur, merci de m'avoir écrit ça. Je sais que ça demande beaucoup de courage 💛\n\n" +
      "Ce que tu ressens compte, et *ta vie compte*. Tu n'es pas seule : je suis là avec toi, je ne pars pas.",
    urgentResources:
      "Je préviens tout de suite quelqu'un de l'équipe pour qu'une vraie personne te recontacte ici.\n\n" +
      "Et si tu te sens en danger maintenant, tu peux appeler gratuitement, à tout moment :\n" +
      "• *116* si tu as moins de 18 ans\n• *80 00 12 87* pour les violences faites aux femmes\n• Police *17*, pompiers *18*\n\n" +
      "Dis-moi juste une chose : est-ce que tu es en sécurité là où tu es, en ce moment ?",
    urgentShort:
      "Je suis là avec toi 💛 L'équipe est prévenue et va te recontacter ici. " +
      "Si tu es en danger maintenant : *116* (moins de 18 ans), *80 00 12 87*, police *17*, pompiers *18*.",
    safeYes: "Je suis soulagée de le lire 💛 Tu veux me raconter ce qui se passe ? Prends ton temps, je t'écoute.",
    safeNo:
      "D'accord, merci de me le dire. Si tu peux, va tout de suite près d'autres personnes : une voisine, une tante, une amie, " +
      "un endroit où il y a du monde. Si quelqu'un te menace, appelle le *17*.\n\n" +
      "L'équipe est prévenue. Je reste là avec toi, continue de m'écrire 💛",
    safeAsk: "Je t'entends 💛 Dis-moi juste : est-ce que tu es en sécurité là où tu es, en ce moment ?",
    crisisSupport: [
      "Je t'entends. Ce que tu vis est très lourd, et tu n'as pas à le porter seule 💛",
      "Merci de me faire confiance. Tu peux tout me dire ici, je ne te juge pas.",
      "Je suis toujours là. Quelqu'un de l'équipe va te parler bientôt, et en attendant on continue toutes les deux.",
      "On respire ensemble ? Inspire doucement par le nez… et souffle longtemps par la bouche. Encore une fois. Je suis là.",
      "Tu as bien fait de m'écrire. Est-ce qu'il y a quelqu'un près de toi en ce moment, une personne en qui tu as confiance ?",
    ],
    goodbye: "Prends soin de toi, ma sœur 💛 Reviens quand tu veux en scannant le QR ou en écrivant *Sista*.",
    unsupported: "Pour l'instant je ne lis que les messages écrits 🙏 Écris-moi avec tes mots. Si tu es en danger : *116* ou *80 00 12 87*.",
    humanPrefix: (name) => `👩🏾 *${name}, de l'équipe Sista* :\n`,
    humanClosed: "La conversation avec l'équipe est terminée. Merci pour ta confiance 💛 Je reste là, écris-moi quand tu veux.",
  },

  en: {
    welcome:
      "Hey sis 👋 I'm *Sista*, your big sister who is always here to listen.\n\n" +
      "🔒 It's *anonymous* here: no need to tell me your name, school or workplace.\n" +
      "🧑‍⚕️ My advice is backed by health professionals.\n" +
      "🤝 I'm an automated assistant, but you're not alone: a real team is behind me, ready to step in if you need it.\n" +
      "🚨 If you're in danger, call *116* (under 18) or *80 00 12 87* (free).\n\n" +
      "Shall we chat? Reply *yes* 🙂",
    consentNeeded: "No problem, I'm right here 💛 Type *yes* whenever you want to chat. In danger: *116* or *80 00 12 87*.",
    consentReminder: "Hey sis 👋 To start chatting, just reply *yes* 🙂 And if you're in danger: *116* or *80 00 12 87*.",

    moodAsk: "Great 🙂 Tell me, how are you feeling today? One word is enough, or a score from 1 (very bad) to 5 (very good).",
    moodLow: "Thank you for telling me, that takes courage.",
    moodMid: "Okay, thanks for telling me.",
    moodHigh: "Glad to hear it 😊",
    openQuestion: "What's going on for you right now? Tell me in your own words, I'm listening.",
    openQuestionHigh: "Was there something you wanted to talk about? Tell me, I'm listening.",

    listenPrompt: "I'm listening 💛 Take your time, tell me what happened. I'm here, no judgement.",
    listenPrompt2:
      "I want to be sure I understand you, sis 🙏 Is it at school, university or work? At home or with family? " +
      "With your boyfriend or husband? On WhatsApp, Facebook or TikTok? About your body? Tell me however it comes, there's no wrong way to say it.",
    notSure:
      "I can't quite understand yet, and I don't want to answer beside the point 🙏 But I'm still here.\n\n" +
      "Would you like me to ask a *real person* from the team to contact you here? Reply *yes* or *no*. If you say no, we keep going together.",
    help:
      "You can talk to me about anything weighing on you: exam or work stress, teasing, a problem online, " +
      "your body and periods, your family, your relationship, a pregnancy or your baby, sadness…\n\nJust tell me what's going on.",
    keepGoing: "Go ahead, I'm listening 💛",
    stayWithYou: "Of course I want to talk with you, sis 💛 I'm here, and we keep going together. Tell me.",
    tipsOffer: "Would you like me to share a few small things that often help in this kind of situation? Or would you rather we just keep talking?",
    afterTips: "There you go 💛 What do you think? Shall we keep talking about it?",

    acks: ["Thank you for telling me.", "I see. That's not easy.", "Okay, I understand better.", "Thank you for trusting me."],
    nextStep: "Would you like to keep talking about it, be connected with a *real person*, or talk about something else?",
    closing: "Anytime, sis 💛 I'm here whenever you need. Write to me anytime.",

    topics: {
      stress: {
        open: "Stress can really weigh on you 😔 What's stressing you most right now: the BEPC, the BAC, university exams, work, money, or something else?",
        tips:
          "💡 A few things that help many girls:\n• Split what's ahead into 25-minute blocks, with a break between each\n" +
          "• Sleep enough, even when the deadline is close: your brain remembers better\n• Slow breathing calms your body in one minute",
        exerciseOffer: "Would you like to do a short breathing exercise together, right now?",
        exercise:
          "Okay, let's go 🌿\n\nGet comfortable.\n• Breathe in through your nose, counting 1, 2, 3, 4\n" +
          "• Breathe out gently through your mouth, counting 1, 2, 3, 4, 5, 6\n\nDo it 5 times, slowly. Write to me when you're done.",
        exerciseDone: "Well done 👏 You can do it again whenever stress rises, before an exam for example. How do you feel now?",
      },
      bullying: {
        open: "I'm sorry you're going through this. Nobody has the right to hurt you, and it's *not* your fault. Where does it happen: at school, at work, in your neighbourhood?",
        tips: "💡 What helps:\n• Tell a trusted person (a referent, a parent, a safe colleague)\n• Stay with others when it tends to happen\n• Write down what happens: date, place, who was there. It helps if you decide to report it",
      },
      online: {
        open: "What happens online can be really scary, I know. Tell me: is someone harassing you, threatening you, or sharing something about you?",
        tips: "💡 Right now:\n• Don't reply and don't send anything, no photos, no money\n• *Never* pay, even by Orange Money or Moov Money: blackmail often continues afterwards\n• Take screenshots\n• Block and report the account\n\nIf someone threatens you with a photo, it's *not* your fault. You're not alone in this.",
      },
      periods: {
        open: "You can ask me anything about your body, no shame 🌸 What's worrying you: pain, periods that change, or something else?",
        tips: "💡 Good to know:\n• Period cramps are common; a warm cloth on your belly or rest can help\n• Slightly irregular periods are common, especially in the first years\n• If pain keeps you from class or work every month, or something worries you, go to the health centre (CSPS) or see the nurse",
      },
      family: {
        open: "Tension at home weighs a lot 💛 Who is it difficult with right now?",
        tips: "💡 What can help:\n• Find a trusted person outside home, to breathe\n• Write down how you feel, just for you\n• If you're forced into something (marriage, work), call *116* (under 18) or *80 00 12 87*",
      },
      couple: {
        open: "I'm listening. A relationship should make you feel good. What's happening with him?",
        tips: "💡 Be careful if your partner:\n• controls your phone, outings or money\n• insults you, puts you down or scares you\n• forces you to do things you don't want\n\nThat is *not* love, and it's *not* your fault. *80 00 12 87* is free and confidential.",
      },
      maternity: {
        open: "Being pregnant or becoming a mum brings a lot of emotions at once 💛 Are you pregnant right now, or is your baby already born?",
        tips: "💡 Good to know:\n• It's normal not to feel fine all the time, even when you love your baby\n• Crying or feeling fragile in the first days after birth is common\n• If sadness lasts more than 2 weeks, or you can't take care of yourself or the baby, talk to the midwife or the health centre (CSPS) soon\n• Accepting help is not a weakness",
      },
      sadness: {
        open: "I'm here 💛 Have you been feeling like this for a long time?",
        tips: "💡 Small steps that can help:\n• Talk to someone you like, even for 5 minutes\n• Walk outside in daylight\n• Do one small thing you used to enjoy\n\nAnd if sadness is there almost every day for more than 2 weeks, it's worth talking to a real person.",
      },
    },

    referralOffer:
      "I can ask a *trained referent* or a *health professional* from the team to contact you back here, on WhatsApp.\n\n" +
      "🔒 They only see this number, not our past messages.\n\nWould you like that? Reply *yes* or *no*.",
    referralConfirmed: "Noted ✅ A trusted person will contact you here. Meanwhile, if you're in danger: *116* or *80 00 12 87*.",
    referralDeclined: "Okay, it's your choice 💛 I'm still here. Want to talk about something else?",
    concern:
      "Oh sis… what you're going through sounds really heavy. Thank you for trusting me with it, I know it isn't easy 💛\n\n" +
      "I'm here to listen, no judgement. Do you want to tell me what's going on?\n\n" +
      "And if at any point you'd rather talk to a real person from the team, just tell me and I'll arrange it.",
    concernFollow: [
      "I hear you, and everything you feel is valid 💛 Go on, I'm listening.",
      "Thank you for trusting me. You don't have to carry all this alone. What weighs on you most right now?",
      "I'm still here. And whenever you want, I can ask someone from the team to talk with you: just say *a real person*.",
    ],
    urgent:
      "Sis, thank you for writing this to me. I know it takes a lot of courage 💛\n\n" +
      "What you feel matters, and *your life matters*. You're not alone: I'm here with you, I'm not going anywhere.",
    urgentResources:
      "I'm alerting someone from the team right now so a real person contacts you here.\n\n" +
      "And if you feel in danger now, you can call for free, anytime:\n" +
      "• *116* if you are under 18\n• *80 00 12 87* for violence against women\n• Police *17*, fire brigade *18*\n\n" +
      "Just tell me one thing: are you safe where you are, right now?",
    urgentShort:
      "I'm here with you 💛 The team has been alerted and will contact you here. " +
      "If you're in danger now: *116* (under 18), *80 00 12 87*, police *17*, fire brigade *18*.",
    safeYes: "I'm relieved to read that 💛 Do you want to tell me what's going on? Take your time, I'm listening.",
    safeNo:
      "Okay, thank you for telling me. If you can, go right now to be near other people: a neighbour, an aunt, a friend, " +
      "somewhere with people around. If someone is threatening you, call *17*.\n\nThe team has been alerted. I'm staying with you, keep writing to me 💛",
    safeAsk: "I hear you 💛 Just tell me: are you safe where you are, right now?",
    crisisSupport: [
      "I hear you. What you're living is very heavy, and you don't have to carry it alone 💛",
      "Thank you for trusting me. You can tell me anything here, no judgement.",
      "I'm still here. Someone from the team will talk with you soon, and meanwhile we keep going together.",
      "Shall we breathe together? Breathe in gently through your nose… and out slowly through your mouth. Once more. I'm here.",
      "You did the right thing writing to me. Is there someone near you right now, someone you trust?",
    ],
    goodbye: "Take care, sis 💛 Come back anytime by scanning the QR code or typing *Sista*.",
    unsupported: "For now I can only read written messages 🙏 Write to me in your own words. In danger: *116* or *80 00 12 87*.",
    humanPrefix: (name) => `👩🏾 *${name}, from the Sista team*:\n`,
    humanClosed: "Your conversation with the team has ended. Thank you for your trust 💛 I'm still here, write to me anytime.",
  },
};
