# RVUNL/DISCOM Tracker — Setup Guide

Ye app Raj Setu Tracker jaisi hi bani hai (same architecture — React/TypeScript,
Capacitor, Supabase, IndexedDB), sirf exam badla hai: RVUNL/DISCOM (JVVNL, AVVNL,
JdVVNL) Junior Assistant / Commercial Assistant-II.

## 1. GitHub par upload

1. Naya GitHub repo banao (public ya private, dono chalega)
2. Is poori zip ka content us repo me push kar do
3. `main` branch par push hote hi `.github/workflows/build-apk.yml` khud chal
   jayega aur kuch minutes me signed APK ban ke GitHub Releases me aa jayega
   (koi manual keystore setup nahi karna — workflow pehli baar khud keystore
   generate karega aur usko commit karke reuse karega)

## 2. Supabase — NAYA project banao (zaroori)

⚠️ **Raj Setu Tracker ka wahi Supabase project reuse mat karna.** MCQ/study-content
sync poore table ka saara data ek saath download karta hai — koi exam-wise filter
column nahi hai. Same backend use karne se Raj Setu ka pura content bhi is app
me mix ho jayega.

Steps:
1. https://supabase.com par free naya project banao
2. Project ke SQL Editor me ye query chalao (dono tables ek saath ban jayengi):

```sql
create table mcq_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null,
  question_text text not null,
  options text[] not null,
  correct_option int not null,
  explanation text
);

create table topic_content (
  topic_id text primary key,
  key_points text[] not null default '{}',
  detailed_content text,
  updated_at timestamptz default now()
);

-- Dono tables par public read allow karo (anon key se sirf padhne ke liye)
alter table mcq_questions enable row level security;
alter table topic_content enable row level security;

create policy "public read" on mcq_questions for select using (true);
create policy "public read" on topic_content for select using (true);
```

3. Project ke **Settings → API** page se `Project URL` aur `anon public` key
   copy karke `.env` file me daalo:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

4. `topic_id` values `src/lib/syllabus/syllabusData.ts` me diye gaye IDs se match
   honi chahiye (e.g. `reasoning-1`, `maths-6`, `hindi-3`, `english-8`, `gk-9`
   waghera) — tabhi MCQ aur study content sahi topic ke saath link honge.

## Syllabus verification note

Syllabus ko sirf aggregator sites se nahi, balki **asli official notification PDF**
(RVUN Advertisement No. RVUN/Rectt.-2026-27/03, dinank 04 August 2026, Chief
Personnel Officer dwara digitally signed) se seedha padh kar verify kiya hai.

**Zaroori correction jo mili:**

Aapke document me likha tha ki RVUNL me alag Pre/Main exam nahi hota (sirf ek
CBT hota hai, RSMSSB LDC jaisa nahi). **Ye galat nikla** — official notification
saaf kehta hai ki Junior Assistant/Commercial Assistant-II ka Phase-I asal me
**do stages** me hota hai:

- **Stage-1 (Pre-examination)** — sirf screening/shortlisting ke liye, iske
  marks final merit me nahi jud़te
- **Stage-2 (Main-examination)** — iske marks 40% weightage ke saath final
  merit me judte hain

Dono stages ka syllabus same hai (Reasoning, Maths, GK & Science, Hindi,
English). Phase-II (Typing Test) ka 60% weightage final merit me judta hai.

App me `examScheme.ts` ke `EXAM_SCHEME_META.notes` me ye correction pehle hi
note ke roop me daal diya hai (RVUNL/DISCOM Tracker ke "सिलेबस" page par
dikhega).

अपडेट (06-11-2026 की Pre-Examination स्कीम के अनुसार):

- Pre-Examination: 70 प्रश्न, 100 अंक, 60 मिनट, Omnibus पेपर, हर प्रश्न में 5 विकल्प,
  नेगेटिव मार्किंग नहीं।
- अंक-विभाजन: रीजनिंग 10, राजस्थान GK 23 प्रश्न (46 अंक), विश्व/भारत GK + विज्ञान
  7 प्रश्न (14 अंक), हिंदी 10, अंग्रेज़ी 10, गणित 10।
- Main-Examination की स्कीम अभी जारी नहीं हुई है। नेगेटिव मार्किंग का अनुपात
  (ऐप में 0.25, अनुमान) पुष्टि होने पर `examScheme.ts` में बदलें।
- पासिंग अंक: UR 30%, आरक्षित वर्ग 20% (दूसरी वेबसाइटों के अनुसार)। कोई इंटरव्यू नहीं।

पुराना "140 प्रश्न / 200 अंक / 2 घंटे" और विषय-वार बँटवारा (20/45/15/20/20/20)
Pre-Examination के लिए सही नहीं निकला, इसलिए हटा दिया गया है।

## Kya badla hai Raj Setu Tracker se

- App naam: **RVUNL/DISCOM Tracker**, App ID: `com.rvunldiscom.jatracker`
- Syllabus: RVUNL/DISCOM Junior Assistant ke 5 sections (Reasoning, Maths,
  GK & Science, Hindi, English) + Phase-II Typing Test scheme
- Signing keystore: naya alias/password (Raj Setu ke keystore se bilkul alag,
  isliye dono apps independent rahenge)
- Baaki poora architecture (offline IndexedDB caching, Study tab, AI Doubt
  Solver, mock tests, revision, stats, etc.) same hai — bas naya Supabase
  project set karne ke baad AI se naya syllabus content generate karwana hoga
  (jaise Raj Setu me generateTopicContent.ts se kiya tha).
