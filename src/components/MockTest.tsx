import { useEffect, useRef, useState } from "react";
import { Clock, AlertCircle, Flag, CheckCircle2, XCircle } from "lucide-react";
import { getAllCachedMCQFlat, putMockTestAttempt, type CachedMCQQuestion } from "@/lib/db/db";
import {
  NEGATIVE_MARKING_BY_MODE,
  PRE_EXAM,
  PRE_SECTIONS,
  preSectionOf,
  type MockMode,
} from "@/lib/syllabus/examScheme";
import { findTopic } from "@/lib/syllabus/syllabusData";
import { syncWrongAnswerBank } from "@/lib/mcq/wrongAnswerBank";

type QuestionWithTopic = CachedMCQQuestion & { topicId: string };

interface Props {
  questionCount: number; // Main मोड में 25 / 50 / 100। Pre मोड में हमेशा 70।
  mode: MockMode; // pre = 70 प्रश्न, 60 मिनट, नेगेटिव नहीं | main = नेगेटिव मार्किंग
  onFinish: () => void;
}

const MAIN_SECONDS_PER_QUESTION = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pre में GK का हर प्रश्न 2 अंक का है, बाकी 1 अंक के। Main में अभी सबके 1 अंक मानते हैं। */
function marksOf(q: QuestionWithTopic, mode: MockMode): number {
  if (mode !== "pre") return 1;
  const sec = PRE_SECTIONS.find((s) => s.key === preSectionOf(q.topicId));
  return sec?.marksPerQuestion ?? 1;
}

/** Pre: हर section से तय संख्या में प्रश्न चुनता है, कमी होने पर बाकी बचे प्रश्नों से भरता है। */
function pickPre(all: QuestionWithTopic[]): QuestionWithTopic[] {
  const pool = shuffle(all);
  const picked: QuestionWithTopic[] = [];
  const used = new Set<string>();
  for (const sec of PRE_SECTIONS) {
    let n = 0;
    for (const q of pool) {
      if (n >= sec.questions) break;
      if (preSectionOf(q.topicId) === sec.key && !used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
        n++;
      }
    }
  }
  for (const q of pool) {
    if (picked.length >= PRE_EXAM.totalQuestions) break;
    if (!used.has(q.id)) {
      picked.push(q);
      used.add(q.id);
    }
  }
  return shuffle(picked);
}

/** नतीजे में विषय का नाम: Pre में स्कीम का section, Main में सिलेबस का विषय। */
function sectionLabelOf(topicId: string, mode: MockMode): string {
  if (mode === "pre") {
    const sec = PRE_SECTIONS.find((s) => s.key === preSectionOf(topicId));
    if (sec) return sec.label;
  }
  return findTopic(topicId)?.subject.hindiName ?? "अन्य";
}

interface SectionResult {
  label: string;
  total: number;
  correct: number;
  wrong: number;
  score: number;
  maxScore: number;
}

function sectionBreakdown(questions: QuestionWithTopic[], answers: Record<number, number>, mode: MockMode): SectionResult[] {
  const negative = NEGATIVE_MARKING_BY_MODE[mode];
  const map = new Map<string, SectionResult>();
  questions.forEach((q, idx) => {
    const label = sectionLabelOf(q.topicId, mode);
    const r = map.get(label) ?? { label, total: 0, correct: 0, wrong: 0, score: 0, maxScore: 0 };
    const m = marksOf(q, mode);
    r.total++;
    r.maxScore += m;
    const ans = answers[idx];
    if (ans !== undefined) {
      if (ans === q.correct_option) { r.correct++; r.score += m; }
      else { r.wrong++; r.score -= m * negative; }
    }
    map.set(label, r);
  });
  return [...map.values()].map((r) => ({ ...r, score: Math.round(r.score * 100) / 100 }));
}

/** गलत उत्तर "गलत उत्तर बैंक" में जाते हैं, सही हुए हटते हैं (topic-wise टेस्ट जैसा)। */
async function syncBankFromMock(questions: QuestionWithTopic[], answers: Record<number, number>) {
  const byTopic = new Map<string, { qs: QuestionWithTopic[]; ans: Record<number, number> }>();
  questions.forEach((q, idx) => {
    const g = byTopic.get(q.topicId) ?? { qs: [], ans: {} };
    if (answers[idx] !== undefined) g.ans[g.qs.length] = answers[idx];
    g.qs.push(q);
    byTopic.set(q.topicId, g);
  });
  await Promise.all([...byTopic].map(([topicId, g]) => syncWrongAnswerBank(topicId, g.qs, g.ans)));
}

function grade(questions: QuestionWithTopic[], answers: Record<number, number>, mode: MockMode) {
  const negative = NEGATIVE_MARKING_BY_MODE[mode];
  let correct = 0, wrong = 0, skipped = 0, gained = 0, lost = 0, maxScore = 0;
  questions.forEach((q, idx) => {
    const m = marksOf(q, mode);
    maxScore += m;
    const ans = answers[idx];
    if (ans === undefined) skipped++;
    else if (ans === q.correct_option) { correct++; gained += m; }
    else { wrong++; lost += m * negative; }
  });
  const score = Math.round((gained - lost) * 100) / 100;
  return { correct, wrong, skipped, score, maxScore };
}

export function MockTest({ questionCount, mode, onFinish }: Props) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionWithTopic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [showPalette, setShowPalette] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "skipped">("wrong");
  const [showReview, setShowReview] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const startedAtRef = useRef<number>(0);
  const submittedRef = useRef(false);
  // समय खत्म होने पर भी ताज़ा उत्तर सेव हों, इसलिए ref में रखते हैं।
  const answersRef = useRef<Record<number, number>>({});
  const questionsRef = useRef<QuestionWithTopic[]>([]);

  useEffect(() => {
    (async () => {
      const all = await getAllCachedMCQFlat();
      const picked = mode === "pre" ? pickPre(all) : shuffle(all).slice(0, questionCount);
      setQuestions(picked);
      questionsRef.current = picked;
      setSecondsLeft(mode === "pre" ? PRE_EXAM.durationMinutes * 60 : picked.length * MAIN_SECONDS_PER_QUESTION);
      startedAtRef.current = Date.now();
      setLoading(false);
    })();
  }, [questionCount, mode]);

  const selectAnswer = (idx: number, opt: number) => {
    answersRef.current = { ...answersRef.current, [idx]: opt };
    setAnswers(answersRef.current);
  };

  const handleSubmit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    const qs = questionsRef.current;
    const g = grade(qs, answersRef.current, mode);
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);

    await putMockTestAttempt({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      totalQuestions: qs.length,
      correct: g.correct, wrong: g.wrong, skipped: g.skipped, score: g.score,
      maxScore: g.maxScore,
      durationSeconds,
      mode,
      createdAt: Date.now(),
    });
    await syncBankFromMock(qs, answersRef.current).catch(() => {});
  };

  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          void handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, questions.length]);

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">सवाल तैयार हो रहे हैं…</div>;

  if (questions.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center gap-2 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          अभी कोई MCQ cache में नहीं है। पहले कुछ टॉपिक्स के MCQ टेस्ट खोलें (ताकि वो cache हो जाएँ), फिर मॉक टेस्ट करें।
        </p>
        <button onClick={onFinish} className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">वापस जाएँ</button>
      </div>
    );
  }

  if (submitted) {
    const g = grade(questions, answers, mode);
    const negative = NEGATIVE_MARKING_BY_MODE[mode];
    const short = mode === "pre" && questions.length < PRE_EXAM.totalQuestions;
    const sections = sectionBreakdown(questions, answers, mode);

    if (showReview) {
      const items = questions
        .map((q, idx) => ({ q, idx, ans: answers[idx] }))
        .filter(({ q, ans }) =>
          reviewFilter === "all" ? true : reviewFilter === "skipped" ? ans === undefined : ans !== undefined && ans !== q.correct_option,
        );
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {([["wrong", "गलत"], ["skipped", "छूटे"], ["all", "सभी"]] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setReviewFilter(k)}
                className={`rounded-lg border py-2 text-xs font-bold ${reviewFilter === k ? "border-primary bg-primary/10 text-primary" : "border-input"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">इस सूची में कोई प्रश्न नहीं है।</p>}
          {items.map(({ q, idx, ans }) => (
            <div key={idx} className="card-surface space-y-2 p-3">
              <p className="text-[11px] text-muted-foreground">प्रश्न {idx + 1} · {sectionLabelOf(q.topicId, mode)}</p>
              <p className="text-sm font-semibold leading-relaxed">{q.question_text}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correct_option;
                  const isMine = oi === ans;
                  const cls = isCorrect
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isMine
                      ? "border-rose-500 bg-rose-500/10"
                      : "border-border";
                  return (
                    <div key={oi} className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${cls}`}>
                      <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                      {isMine && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-rose-600" />}
                    </div>
                  );
                })}
              </div>
              {ans === undefined && <p className="text-[11px] font-semibold text-muted-foreground">आपने यह प्रश्न छोड़ा था।</p>}
              {q.explanation && (
                <p className="rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">व्याख्या: </span>{q.explanation}
                </p>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setShowReview(false)} className="flex-1 rounded-lg border border-input py-2.5 text-xs font-semibold">
              नतीजे पर वापस
            </button>
            <button onClick={onFinish} className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground">
              ठीक है
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="card-surface space-y-3 p-4 text-center">
          <h3 className="text-lg font-bold">मॉक टेस्ट पूरा हुआ! 🎯</h3>
          <div className="text-3xl font-black text-primary">
            {g.score}
            <span className="text-base font-semibold text-muted-foreground"> / {g.maxScore}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            कुल {questions.length} सवाल{" "}
            {negative > 0 ? `(नेगेटिव मार्किंग −${negative} शामिल)` : "(नेगेटिव मार्किंग नहीं)"}
          </p>
          {short && (
            <p className="text-[11px] text-amber-600">
              ध्यान दें: cache में सिर्फ़ {questions.length} प्रश्न थे, इसलिए पूरे 70 प्रश्न नहीं बन पाए।
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            <div className="rounded-lg bg-emerald-500/10 p-2 font-semibold text-emerald-600">{g.correct} सही</div>
            <div className="rounded-lg bg-rose-500/10 p-2 font-semibold text-rose-600">{g.wrong} गलत</div>
            <div className="rounded-lg bg-muted p-2 font-semibold text-muted-foreground">{g.skipped} छूटे</div>
          </div>
          {g.wrong > 0 && <p className="text-[11px] text-muted-foreground">गलत उत्तर "गलत उत्तर बैंक" में जोड़ दिए गए हैं।</p>}
        </div>

        <div className="card-surface overflow-hidden p-0">
          <h4 className="border-b border-border px-3 py-2 text-sm font-bold">विषय-वार नतीजा</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-bold">विषय</th>
                <th className="px-2 py-2 text-center font-bold">सही/गलत</th>
                <th className="px-3 py-2 text-right font-bold">अंक</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((r, i) => (
                <tr key={r.label} className={i !== sections.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-3 py-2 text-muted-foreground">{r.label}</td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    <span className="text-emerald-600">{r.correct}</span> / <span className="text-rose-600">{r.wrong}</span>
                    <span className="text-muted-foreground"> ({r.total})</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.score} / {r.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowReview(true)} className="flex-1 rounded-lg border border-input py-2.5 text-sm font-semibold touch-tap">
            उत्तर देखें
          </button>
          <button onClick={onFinish} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground touch-tap">
            ठीक है
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <button onClick={() => setShowPalette((v) => !v)} className="text-xs font-semibold underline decoration-dotted underline-offset-4">
          प्रश्न {currentIndex + 1} / {questions.length}
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: secondsLeft < 60 ? "var(--color-hard)" : "var(--color-foreground)" }}>
          <Clock className="h-3.5 w-3.5" /> {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      {showPalette && (
        <div className="card-surface space-y-2 p-3">
          <div className="grid grid-cols-10 gap-1">
            {questions.map((_, i) => {
              const answered = answers[i] !== undefined;
              const cls = marked[i]
                ? "bg-amber-500 text-white"
                : answered
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground";
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setShowPalette(false); }}
                  className={`h-7 rounded text-[10px] font-bold ${cls} ${i === currentIndex ? "ring-2 ring-primary" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            हरा = उत्तर दिया · पीला = बाद में देखें · स्लेटी = बाकी ({questions.length - Object.keys(answers).length} बाकी)
          </p>
        </div>
      )}

      <div className="card-surface p-4">
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setMarked((m) => ({ ...m, [currentIndex]: !m[currentIndex] }))}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${marked[currentIndex] ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}
          >
            <Flag className="h-3 w-3" /> {marked[currentIndex] ? "चिह्नित" : "बाद में देखें"}
          </button>
        </div>
        <p className="mb-3 text-sm font-semibold leading-relaxed">{q.question_text}</p>
        <div className="space-y-2">
          {q.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => selectAnswer(currentIndex, idx)}
              className={`w-full rounded-lg border p-2.5 text-left text-sm font-medium touch-tap ${
                answers[currentIndex] === idx ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="flex-1 rounded-lg border border-input py-2.5 text-xs font-semibold disabled:opacity-40"
        >
          पिछला
        </button>
        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => {
              const left = questions.length - Object.keys(answers).length;
              if (left > 0 && !window.confirm(`${left} प्रश्न अभी बाकी हैं। फिर भी सबमिट करें?`)) return;
              void handleSubmit();
            }}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white">
            सबमिट करें
          </button>
        ) : (
          <button onClick={() => setCurrentIndex((i) => i + 1)} className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground">
            अगला
          </button>
        )}
      </div>
    </div>
  );
}
