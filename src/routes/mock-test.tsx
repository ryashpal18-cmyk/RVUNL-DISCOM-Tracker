import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MockTest } from "@/components/MockTest";
import { getAllMockTestAttempts, type MockTestAttempt } from "@/lib/db/db";
import { PRE_EXAM, PRE_SECTIONS, type MockMode } from "@/lib/syllabus/examScheme";

export const Route = createFileRoute("/mock-test")({
  head: () => ({ meta: [{ title: "मॉक टेस्ट" }, { name: "description", content: "Pre परीक्षा के पैटर्न (70 प्रश्न, 60 मिनट) और Main (नेगेटिव मार्किंग के साथ) का मॉक टेस्ट।" }] }),
  component: MockTestPage,
});

const MAIN_OPTIONS = [25, 50, 100];

function MockTestPage() {
  const [count, setCount] = useState<number | null>(null);
  const [mode, setMode] = useState<MockMode>("pre");
  const [history, setHistory] = useState<MockTestAttempt[]>([]);

  useEffect(() => {
    if (count == null) {
      getAllMockTestAttempts().then(setHistory);
    }
  }, [count]);

  if (count != null) {
    return (
      <AppShell title="मॉक टेस्ट" subtitle={`${mode === "pre" ? "Pre" : "Main"} · ${count} सवाल`} back>
        <MockTest questionCount={count} mode={mode} onFinish={() => setCount(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell title="मॉक टेस्ट" subtitle="पूरे सिलेबस से रैंडम टेस्ट" back>
      <div className="space-y-4">
        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">परीक्षा का प्रकार</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["pre", "main"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-xl border py-3 text-sm font-bold touch-tap ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-input"}`}
              >
                {m === "pre" ? "Pre (नेगेटिव नहीं)" : "Main (नेगेटिव है)"}
              </button>
            ))}
          </div>
        </div>

        {mode === "pre" ? (
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-bold">Pre-Examination का पैटर्न</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {PRE_EXAM.totalQuestions} प्रश्न · {PRE_EXAM.totalMarks} अंक · {PRE_EXAM.durationMinutes} मिनट · नेगेटिव मार्किंग नहीं
            </p>
            <ul className="mb-3 space-y-1">
              {PRE_SECTIONS.map((s) => (
                <li key={s.key} className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{s.questions} प्रश्न × {s.marksPerQuestion}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setCount(PRE_EXAM.totalQuestions)}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground touch-tap"
            >
              Pre मॉक टेस्ट शुरू करें
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              नोट: सिर्फ़ वही टॉपिक्स शामिल होंगे जिनके MCQ पहले से cache हैं (यानी जो टॉपिक कम से कम एक बार खोले जा चुके हैं)। किसी section के प्रश्न कम हों तो बाकी प्रश्नों से भरे जाते हैं।
            </p>
          </div>
        ) : (
          <div className="card-surface p-4">
            <h2 className="mb-3 text-sm font-bold">कितने सवाल?</h2>
            <div className="grid grid-cols-3 gap-2">
              {MAIN_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className="rounded-xl border border-input py-3 text-sm font-bold touch-tap hover:border-primary hover:text-primary"
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Main की स्कीम अभी जारी नहीं हुई है। यहाँ हर प्रश्न 1 अंक का और गलत उत्तर पर 0.25 की कटौती (अनुमान) है।
            </p>
          </div>
        )}

        {history.length > 0 && (
          <div className="card-surface p-4">
            <h2 className="mb-3 text-sm font-bold">पिछले attempts</h2>
            <div className="space-y-2">
              {history.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {a.date} · {a.mode ? (a.mode === "pre" ? "Pre · " : "Main · ") : ""}{a.totalQuestions} सवाल
                  </span>
                  <span className="font-bold text-primary">
                    {a.score}{a.maxScore ? ` / ${a.maxScore}` : ""} अंक
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
