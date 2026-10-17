export const learningSources = {
  bystander: {
    name: "Right To Be · The 5Ds of bystander intervention",
    url: "https://righttobe.org/guides/bystander-intervention-training/",
  },
  technology: {
    name: "NNEDV Safety Net · Technology safety planning",
    url: "https://www.techsafety.org/resources-survivors/technology-safety-plan",
  },
  documenting: {
    name: "NNEDV Safety Net · Documentation tips",
    url: "https://www.techsafety.org/documentationtips",
  },
  listening: {
    name: "WHO · Listening when women need it most",
    url: "https://www.who.int/news-room/commentaries/detail/health-workers-listening-when-women-need-it-most",
  },
  travel: {
    name: "GOV.UK · Foreign travel checklist (UK-focused)",
    url: "https://www.gov.uk/guidance/foreign-travel-checklist",
  },
  warnings: {
    name: "RAINN · Relationship warning signs",
    url: "https://rainn.org/warning-signs-of-sexual-violence-in-teens/",
  },
  consent: {
    name: "RAINN · Consent 101",
    url: "https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/",
  },
  body: {
    name: "NSPCC · Talk PANTS (for children and carers)",
    url: "https://www.nspcc.org.uk/advice-for-families/pants-underwear-rule/",
  },
  support: {
    name: "NHS · Help after sexual assault (UK services)",
    url: "https://www.nhs.uk/live-well/sexual-health/help-after-rape-and-sexual-assault/",
  },
};
export const lessons = [
  {
    id: "boundaries",
    number: "01",
    title: "Your body. Your boundaries.",
    intro: "Understanding unwanted or unsafe touch — sometimes called ‘bad touch’.",
    source: "consent" as const,
    points: [
      [
        "Permission matters",
        "Unwanted sexual touching, groping, forced kissing or being made to touch someone is not okay. A relationship, gift or position of authority does not give someone permission.",
      ],
      [
        "Consent can change",
        "Agreement must be freely given, specific and ongoing. A previous yes is not a yes today. Silence, freezing or lack of resistance is not consent; someone asleep or too intoxicated to decide cannot consent.",
      ],
      [
        "It may feel confusing",
        "Abuse does not have to hurt or leave a mark. It can involve someone you know. Clothing, where you went, drinking or how you reacted never make abuse your fault.",
      ],
    ],
  },
  {
    id: "children",
    number: "02",
    title: "Body safety for younger people.",
    intro: "For children, parents, carers and anyone supporting a young person.",
    source: "body" as const,
    points: [
      [
        "Use clear, calm words",
        "Explain that private body parts are private, their body belongs to them, and they may refuse unwanted touch even from a familiar person. Unsafe touch can feel confusing or not hurt; it is never a child’s fault. Necessary care should be explained in age-appropriate language.",
      ],
      [
        "No frightening secrets",
        "Gifts, threats or requests to keep touching or images secret are reasons to tell a safe adult. Abuse can happen online and without physical contact.",
      ],
      [
        "Keep telling someone safe",
        "If one person does not help, tell another trusted adult, teacher or safeguarding professional. A child is never responsible for stopping abuse. Listen calmly and avoid leading questions or promising secrecy.",
      ],
    ],
  },
  {
    id: "signals",
    number: "03",
    title: "Notice the behaviour.",
    intro: "You can seek help for a concern without proving someone’s intentions.",
    source: "warnings" as const,
    points: [
      [
        "Pressure is a warning sign",
        "Ignoring a boundary, using guilt or threats, blocking your exit, or repeatedly pushing after you hesitate are reasons to seek distance and support when you can.",
      ],
      [
        "Online boundaries count",
        "You do not owe anyone intimate photos, passwords or constant location access. Threatening to share intimate images or demanding sexual contact in return for help is abuse.",
      ],
      [
        "Choose what is feasible",
        "Move toward a staffed public place, contact someone you trust or ask a specific person for help. Avoid confrontation if it could increase danger. There is no perfect response you were required to make.",
      ],
    ],
  },
  {
    id: "carry",
    number: "04",
    title: "Carry a little backup.",
    intro:
      "Practical options, not a checklist that makes you responsible for another person’s actions.",
    source: "travel" as const,
    points: [
      [
        "Connection",
        "A charged phone, power bank and cable; important contacts written on paper; a planned check-in with someone you trust.",
      ],
      [
        "Everyday essentials",
        "Water, medication you need, backup fare or payment, and a small torch if useful. Choose what suits your journey, access needs and local rules.",
      ],
      [
        "Before a ride",
        "Check the vehicle and driver against your booking, consider sharing the ride link, and identify staffed places along the route. No item or route can guarantee safety.",
      ],
    ],
  },
  {
    id: "support",
    number: "05",
    title: "If something has happened.",
    intro: "You deserve care, even if you are unsure what to call the experience.",
    source: "support" as const,
    points: [
      [
        "Get somewhere safer",
        "If possible, reach a trusted person or staffed place. In immediate danger, use your local emergency service. Cocoon’s demo SOS does not dispatch help.",
      ],
      [
        "Seek timely medical care",
        "A clinician or specialist sexual-assault service can discuss injuries, pregnancy/STI prevention and forensic options. Some care is time-sensitive. You can still ask for help if you have washed or changed.",
      ],
      [
        "Support without pressure",
        "Listen, say you believe them, and ask what would help. Do not demand details or blame their choices. Reporting, confidentiality and child-protection duties vary by location; a local specialist can explain options.",
      ],
    ],
  },
  {
    id: "digital",
    number: "06",
    title: "Your digital space matters.",
    intro: "Stalking, coercion and image-based abuse can happen through a device, too.",
    source: "technology" as const,
    points: [
      [
        "Recognise control",
        "Demands for passwords, repeated unwanted messages, threats involving intimate images, or monitoring where you go can be abusive. Being in a relationship does not entitle someone to your accounts or location.",
      ],
      [
        "Plan changes around your circumstances",
        "If someone may be monitoring a device, consider a safer device and help from a specialist. Abruptly removing access or a tracker can alert the person; make changes with a plan that suits you.",
      ],
      [
        "Choose what to share",
        "Review recipients before sharing a trip, location or recording. A family or shared account may expose information to people you did not intend. You can ask for support without collecting evidence first.",
      ],
    ],
  },
  {
    id: "bystander",
    number: "07",
    title: "A small intervention. Real care.",
    intro:
      "Options for witnessing harassment. Choose an approach that does not put you or the person at greater risk.",
    source: "bystander" as const,
    points: [
      [
        "Distract or delegate",
        "Offer an ordinary interruption, such as asking for directions, or ask a specific staff member or other person for help. You do not have to confront the person causing harm.",
      ],
      [
        "Delay or support",
        "When it is feasible, check in afterwards: ‘I saw what happened. Would you like company or help?’ Let the person decide what support they want.",
      ],
      [
        "Document with care",
        "First make sure someone is helping. If you record, consider your safety and the affected person's wishes; ask before sharing, and do not post their experience online without consent. Recording rules vary. Direct intervention is only one option and can escalate a situation.",
      ],
    ],
  },
  {
    id: "supporting",
    number: "08",
    title: "Listen. Believe. Offer choices.",
    intro:
      "Support for a friend, child or someone who depends on others. Adapted from first-line support principles; not professional crisis care.",
    source: "listening" as const,
    points: [
      [
        "Start with what they need",
        "Listen without pressing for details. Say ‘I am glad you told me’ or ‘This is not your fault.’ Ask whether they want someone to stay, help finding care, or help contacting someone.",
      ],
      [
        "Keep access and independence in view",
        "Ask what works for their communication, mobility, sensory or language needs. Offer an interpreter or advocate where available. Speak directly to the person and do not assume a carer or partner is safe to contact.",
      ],
      [
        "For a child",
        "Listen calmly, use their words, avoid leading questions, and explain who you need to tell to help. Do not promise secrecy or investigate yourself. Contact an appropriate local safeguarding service; reporting duties differ by location.",
      ],
    ],
  },
];
export const scenarios = [
  {
    question: "Someone you know keeps touching you after you pull away.",
    answer:
      "Knowing someone does not give them permission. Your boundary matters; get support or distance if you can. You are not to blame if you freeze.",
  },
  {
    question: "A friend shares that something happened and asks you what to do.",
    answer:
      "Listen without pressing for details. Ask what they need, offer to help find care, and respect their choices. For a child or immediate danger, seek safeguarding or emergency help.",
  },
  {
    question: "A disturbing campus story is going viral in your group chat.",
    answer:
      "Check the original publisher, date and what is confirmed. Do not forward alleged survivor identities, images or graphic details. A viral post is not a finding, and uncertainty is not proof an allegation is false.",
  },
];
