import { useEffect, useRef, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { getAllCachedMCQFlat, putMockTestAttempt, type CachedMCQQuestion } from "@/lib/db/db";
import {
  NEGATIVE_MARKING_BY_MODE,
  PRE_EXAM,
  PRE_SECTIONS,
  preSectionOf,
  type MockMode,
} from "@/lib/syllabus/examScheme";

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

    return (
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
        <button onClick={onFinish} className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground touch-tap">
          ठीक है
        </button>
      </div>
    );
  }

  const q = questions[currentIndex];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
        <span className="text-xs font-semibold">प्रश्न {currentIndex + 1} / {questions.length}</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: secondsLeft < 60 ? "var(--color-hard)" : "var(--color-foreground)" }}>
          <Clock className="h-3.5 w-3.5" /> {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="card-surface p-4">
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
          <button onClick={() => void handleSubmit()} className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white">
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
