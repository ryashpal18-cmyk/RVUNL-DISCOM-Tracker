// परीक्षा से पहले की 3 हफ्ते की योजना (तैयारी गाइड के अनुसार)।
// परीक्षा की तारीख़ (सेटिंग) से तय होता है कि आज कौन सा हफ्ता है।

import { daysRemaining } from "@/lib/notifications/examCountdown";

export interface PlanWeek {
  week: 1 | 2 | 3;
  title: string;
  tasks: string[];
  /** इन यूनिट्स के बाकी टॉपिक "आज का लक्ष्य" में सबसे ऊपर आते हैं। */
  focusUnitIds: string[];
}

export const PLAN_WEEKS: PlanWeek[] = [
  {
    week: 1,
    title: "हफ्ता 1: बुनियाद + GK",
    tasks: [
      "राजस्थान GK: इतिहास, भूगोल, कला-संस्कृति",
      "गणित: प्रतिशत, अनुपात, औसत, लाभ-हानि, SI/CI",
      "रीजनिंग: श्रेणी, कोडिंग-डिकोडिंग, विषम छाँटना",
      "हिंदी और अंग्रेज़ी: व्याकरण की बुनियाद",
      "रोज़ हर विषय के 20–30 MCQ",
    ],
    focusUnitIds: [
      "gk-geo", "gk-history", "gk-raj-history", "gk-raj-geo", "gk-raj-culture",
      "maths-number", "maths-commercial", "reasoning-verbal", "hindi-grammar", "english-grammar",
    ],
  },
  {
    week: 2,
    title: "हफ्ता 2: बाकी सिलेबस + सेक्शनल टेस्ट",
    tasks: [
      "राजस्थान GK: राजव्यवस्था, अर्थव्यवस्था, योजनाएँ, खेल, समसामयिकी",
      "विश्व/भारत GK और दैनिक विज्ञान",
      "गणित: समय-कार्य, चाल-दूरी, क्षेत्रमिति, DI",
      "रीजनिंग: घड़ी, दर्पण प्रतिबिंब, आकृतियाँ",
      "हर विषय का सेक्शनल टेस्ट और गलतियों की कॉपी",
    ],
    focusUnitIds: [
      "gk-raj-admin", "gk-eco", "gk-polity", "gk-current", "gk-india-world", "gk-science-unit",
      "maths-algebra", "reasoning-nonverbal", "hindi-usage", "english-vocab",
    ],
  },
  {
    week: 3,
    title: "हफ्ता 3: मॉक टेस्ट + रिवीजन",
    tasks: [
      "रोज़ 1 पूरा Pre मॉक टेस्ट (70 प्रश्न / 60 मिनट)",
      "मॉक के बाद विश्लेषण: कौन से प्रश्न गलत हुए और क्यों",
      "छोटे नोट्स और गलत उत्तर बैंक से रिवीजन",
      "आख़िरी 2 दिन कोई नया टॉपिक नहीं, सिर्फ़ रिवीजन और पूरी नींद",
    ],
    focusUnitIds: [],
  },
];

export interface PlanStatus {
  days: number;
  plan: PlanWeek;
  /** परीक्षा 21 दिन से ज़्यादा दूर है, यानी योजना अभी शुरू नहीं हुई। */
  early: boolean;
  /** आख़िरी 2 दिन। */
  finalDays: boolean;
}

/** परीक्षा की तारीख़ न हो या निकल चुकी हो तो null। */
export function getPlanStatus(examDate?: string): PlanStatus | null {
  if (!examDate) return null;
  const days = daysRemaining(examDate);
  if (days < 0) return null;
  const week = days > 14 ? 1 : days > 7 ? 2 : 3;
  return {
    days,
    plan: PLAN_WEEKS[week - 1],
    early: days > 21,
    finalDays: days <= 2,
  };
}
