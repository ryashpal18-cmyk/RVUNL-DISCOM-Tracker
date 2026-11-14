// RVUNL व डिस्कॉम (JVVNL, AVVNL, JdVVNL) — जूनियर असिस्टेंट / कमर्शियल असिस्टेंट-II
// स्रोत: RVUN का विज्ञापन क्रमांक RVUN/Rectt.-2026-27/03 और Pre-Examination की स्कीम (दिनांक 06-11-2026)।
// जहाँ "अनुमान" या "दूसरी वेबसाइट" लिखा है, उसे energy.rajasthan.gov.in की मूल सूचना से मिला लें।

export type MockMode = "pre" | "main";

// Pre-examination: नेगेटिव मार्किंग नहीं है।
// Main-examination: नेगेटिव मार्किंग है, पर कटौती का अनुपात अभी जारी नहीं हुआ।
// 0.25 एक अनुमान है। पुष्टि होने पर सिर्फ़ यही मान बदलें।
export const NEGATIVE_MARKING_BY_MODE: Record<MockMode, number> = {
  pre: 0,
  main: 0.25,
};

// ---------- Pre-examination की स्कीम (06-11-2026) ----------
export const PRE_EXAM = {
  totalQuestions: 70,
  totalMarks: 100,
  durationMinutes: 60,
  optionsPerQuestion: 5,
} as const;

export interface PreSection {
  key: "reasoning" | "gk-rajasthan" | "gk-world" | "hindi" | "english" | "maths";
  label: string;
  questions: number;
  marksPerQuestion: number;
}

export const PRE_SECTIONS: PreSection[] = [
  { key: "reasoning", label: "रीजनिंग और मानसिक योग्यता", questions: 10, marksPerQuestion: 1 },
  { key: "gk-rajasthan", label: "सामान्य ज्ञान — राजस्थान से संबंधित", questions: 23, marksPerQuestion: 2 },
  { key: "gk-world", label: "सामान्य ज्ञान — विश्व, भारत व दैनिक विज्ञान", questions: 7, marksPerQuestion: 2 },
  { key: "hindi", label: "सामान्य हिंदी", questions: 10, marksPerQuestion: 1 },
  { key: "english", label: "सामान्य अंग्रेज़ी", questions: 10, marksPerQuestion: 1 },
  { key: "maths", label: "गणित", questions: 10, marksPerQuestion: 1 },
];

// राजस्थान से संबंधित GK के topic (बाकी GK topic "विश्व, भारत व विज्ञान" में गिने जाते हैं)।
const RAJASTHAN_GK_IDS = new Set([
  "gk-1", "gk-4", "gk-5", "gk-6", "gk-7", "gk-8", "gk-9", "gk-10", "gk-11", "gk-12",
  "gk-21", "gk-22", "gk-23", "gk-24", "gk-25", "gk-26", "gk-27", "gk-28", "gk-29", "gk-30",
]);

/** topic id से Pre-exam का section तय करता है। */
export function preSectionOf(topicId: string): PreSection["key"] | null {
  if (topicId.startsWith("reasoning-")) return "reasoning";
  if (topicId.startsWith("maths-")) return "maths";
  if (topicId.startsWith("hindi-")) return "hindi";
  if (topicId.startsWith("english-")) return "english";
  if (topicId.startsWith("gk-")) return RAJASTHAN_GK_IDS.has(topicId) ? "gk-rajasthan" : "gk-world";
  return null;
}

export interface ExamSchemeSection {
  id: string;
  title: string;
  points: string[];
}

export interface SubjectMarksRow {
  subject: string;
  questions: number;
  marks: number;
}

export const EXAM_SCHEME_META = {
  board: "RVUNL / डिस्कॉम (JVVNL, AVVNL, JdVVNL)",
  examName: "जूनियर असिस्टेंट / कमर्शियल असिस्टेंट-II भर्ती परीक्षा",
  stage: "Phase-I, Stage-1: Pre-Examination",
  totalQuestions: PRE_EXAM.totalQuestions,
  totalMarks: PRE_EXAM.totalMarks,
  duration: "01:00 घंटा",
  notes: [
    "Phase-I के दो चरण हैं। Stage-1 Pre-Examination सिर्फ़ छंटनी (शॉर्टलिस्टिंग) के लिए है, इसके अंक अंतिम मेरिट में नहीं जुड़ते। Stage-2 Main-Examination के अंक अंतिम मेरिट में 40% जुड़ते हैं।",
    "Phase-II टाइपिंग टेस्ट का वेटेज 60% है। अंतिम मेरिट = Main (40%) + टाइपिंग (60%)।",
    "Pre-Examination: कुल 70 प्रश्न, 100 अंक, 60 मिनट। पेपर Omnibus है (कोई section नहीं)। हर प्रश्न में 5 विकल्प और सही उत्तर सिर्फ़ 1। नेगेटिव मार्किंग नहीं है, इसलिए कोई प्रश्न खाली न छोड़ें।",
    "Main-Examination की स्कीम (प्रश्न संख्या, अंक, समय, नेगेटिव मार्किंग का अनुपात) अभी जारी नहीं हुई है। ऐप में Main मॉक टेस्ट का नेगेटिव मार्किंग 0.25 सिर्फ़ अनुमान है।",
    "Pre-Examination से लगभग रिक्तियों के 10 गुना उम्मीदवार Main के लिए बुलाए जाते हैं (दूसरी वेबसाइटों के अनुसार)। आरक्षित वर्गों के लिए सीमा में छूट हो सकती है।",
    "न्यूनतम पासिंग अंक: सामान्य (UR) 30%, SC/ST/BC/MBC/EWS/भूतपूर्व सैनिक/PwBD 20% (दूसरी वेबसाइटों के अनुसार)।",
    "कोई इंटरव्यू नहीं होता। प्रश्न पत्र Hindi General और English General को छोड़कर द्विभाषी (हिंदी + अंग्रेज़ी) होता है।",
  ],
};

// Pre-Examination का अंक-विभाजन (स्कीम दिनांक 06-11-2026)
export const SUBJECT_MARKS_DISTRIBUTION: SubjectMarksRow[] = PRE_SECTIONS.map((s) => ({
  subject: s.label,
  questions: s.questions,
  marks: s.questions * s.marksPerQuestion,
}));

export const EXAM_SCHEME_SECTIONS: ExamSchemeSection[] = [
  {
    id: "note",
    title: "पाठ्यक्रम की सूची के बारे में ज़रूरी बात",
    points: [
      "आधिकारिक स्कीम में सिर्फ़ विषयों के नाम और अंक-विभाजन हैं, टॉपिक-वार सूची नहीं।",
      "नीचे की टॉपिक सूची दूसरी वेबसाइटों से ली गई है। इसे मार्गदर्शक मानें और energy.rajasthan.gov.in की सूचना से मिला लें।",
    ],
  },
  {
    id: "reasoning",
    title: "रीजनिंग और मानसिक योग्यता (10 अंक)",
    points: [
      "विश्लेषणात्मक तर्क (Analytical Reasoning), संख्या श्रेणी (Number Series), अक्षर श्रेणी (Letter Series)",
      "विषम छाँटना (Odd Man Out), कोडिंग-डिकोडिंग (Coding-Decoding)",
      "आकृतियाँ (Shapes), दर्पण प्रतिबिंब (Mirror Images), घड़ियाँ (Clocks)",
    ],
  },
  {
    id: "maths",
    title: "गणित — कक्षा 10वीं स्तर (10 अंक)",
    points: [
      "संख्या पद्धति, सरलीकरण, प्रतिशत, लाभ-हानि, अनुपात-समानुपात, औसत",
      "साधारण और चक्रवृद्धि ब्याज, समय और कार्य, समय-चाल-दूरी",
      "साझेदारी, मिश्रण और अलिगेशन, क्षेत्रमिति",
      "बीजगणित, ज्यामिति, आँकड़ों की व्याख्या (Data Interpretation)",
    ],
  },
  {
    id: "gk-science",
    title: "सामान्य ज्ञान और दैनिक विज्ञान (60 अंक)",
    points: [
      "राजस्थान से संबंधित: 23 प्रश्न × 2 = 46 अंक। राजस्थान पर विशेष ज़ोर।",
      "विश्व, भारत और दैनिक विज्ञान: 7 प्रश्न × 2 = 14 अंक।",
      "टॉपिक (दूसरी वेबसाइटों से): समसामयिक घटनाएँ (राजस्थान सहित), राष्ट्रीय व अंतरराष्ट्रीय महत्व की घटनाएँ, चर्चित व्यक्ति और स्थान, खेल, दैनिक विज्ञान, भारतीय इतिहास, नागरिक शास्त्र, भूगोल, भारतीय राजव्यवस्था।",
      "राजस्थान GK के सुझाए गए टॉपिक (यह सुझाव है, आधिकारिक सूची नहीं): इतिहास, भूगोल, कला-संस्कृति, राजव्यवस्था व प्रशासन, अर्थव्यवस्था व ऊर्जा, समसामयिकी।",
    ],
  },
  {
    id: "hindi",
    title: "सामान्य हिंदी — कक्षा 10वीं स्तर (10 अंक)",
    points: [
      "शब्दावली, पर्यायवाची और विलोम शब्द, एक शब्द के लिए अनेक शब्द",
      "मुहावरे और लोकोक्तियाँ, वाक्य शुद्धि, त्रुटि पहचान, रिक्त स्थानों की पूर्ति",
      "अपठित गद्यांश",
      "व्याकरण: संधि, समास, उपसर्ग और प्रत्यय, काल, विराम चिह्न",
    ],
  },
  {
    id: "english",
    title: "सामान्य अंग्रेज़ी — कक्षा 10वीं स्तर (10 अंक)",
    points: [
      "Reading Comprehension, Vocabulary, Synonyms and Antonyms, Idioms and Phrases",
      "Fill in the Blanks, Error Detection, Sentence Improvement, Cloze Test",
      "Para Jumbles, Sentence Completion",
      "Grammar: Active and Passive Voice, Direct and Indirect Speech, Tenses, Articles, Prepositions",
    ],
  },
  {
    id: "typing-test",
    title: "Phase-II: टाइपिंग टेस्ट — अंतिम मेरिट में 60% वेटेज",
    points: [
      "हिंदी टाइपिंग — Speed Test: 10 मिनट (25 अंक)",
      "हिंदी टाइपिंग — Efficiency Test: 10 मिनट (25 अंक)",
      "अंग्रेज़ी टाइपिंग — Speed Test: 10 मिनट (25 अंक)",
      "अंग्रेज़ी टाइपिंग — Efficiency Test: 10 मिनट (25 अंक)",
      "कुल 100 अंक।",
      "PwBD उम्मीदवारों के लिए टाइपिंग टेस्ट की जगह Main परीक्षा के अंकों का औसत लिया जाता है (दूसरी वेबसाइटों के अनुसार)।",
      "सूचना में ये बातें देखें: हिंदी टाइपिंग का कीबोर्ड लेआउट (Inscript/Remington) और फ़ॉन्ट, अंक देने का तरीका, गलतियों की सीमा, और कौन सा कंप्यूटर प्रमाणपत्र मान्य है।",
    ],
  },
];
