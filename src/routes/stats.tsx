import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CircularProgress } from "@/components/CircularProgress";
import { StudyHeatmap } from "@/components/StudyHeatmap";
import { ShareProgressCard } from "@/components/ShareProgressCard";
import { useData } from "@/lib/db/DataContext";
import { SYLLABUS, getAllTopics } from "@/lib/syllabus/syllabusData";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, Flame, Trophy, CheckCircle2, ListChecks, XCircle, Layers } from "lucide-react";
import { getAllMcqStats, type MCQStatsRow } from "@/lib/mcq/mcqStats";
import { computeReadiness } from "@/lib/stats/readiness";
import { getAllMockTestAttempts, type MockTestAttempt } from "@/lib/db/db";
import { findTopic } from "@/lib/syllabus/syllabusData";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "सांख्यिकी" }, { name: "description", content: "प्रगति ग्राफ, स्ट्रीक व उपलब्धियाँ।" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { topicStates, dailyLog, streak } = useData();
  const all = useMemo(() => getAllTopics(), []);
  const completed = all.filter(r => topicStates[r.topic.id]?.isCompleted).length;

  const [mcqStats, setMcqStats] = useState<Record<string, MCQStatsRow>>({});
  useEffect(() => { getAllMcqStats().then(setMcqStats); }, []);
  const [mocks, setMocks] = useState<MockTestAttempt[]>([]);
  useEffect(() => { getAllMockTestAttempts().then(setMocks); }, []);

  // ---- साप्ताहिक रिपोर्ट: पिछले 7 दिन बनाम उससे पहले के 7 दिन ----
  const weekly = useMemo(() => {
    const dayKey = (offset: number) => {
      const d = new Date(); d.setDate(d.getDate() - offset);
      return d.toISOString().slice(0, 10);
    };
    const thisStart = dayKey(6), prevStart = dayKey(13);
    const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
    const today = dayKey(0), prevEnd = dayKey(7);
    const thisLogs = dailyLog.filter((d) => inRange(d.date, thisStart, today));
    const prevLogs = dailyLog.filter((d) => inRange(d.date, prevStart, prevEnd));
    const topics = thisLogs.reduce((n, d) => n + d.completedTopicIds.length, 0);
    const prevTopics = prevLogs.reduce((n, d) => n + d.completedTopicIds.length, 0);
    const minutes = thisLogs.reduce((n, d) => n + (d.minutes ?? 0), 0);
    const activeDays = thisLogs.filter((d) => d.completedTopicIds.length > 0 || (d.minutes ?? 0) > 0).length;

    const weekMocks = mocks.filter((m) => inRange(m.date, thisStart, today));
    const pcts = weekMocks.filter((m) => m.maxScore).map((m) => Math.round((m.score / (m.maxScore as number)) * 100));
    const avgMockPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;

    // विषय-वार औसत MCQ सटीकता (जिन टॉपिक्स के टेस्ट दिए गए)
    const bySubject = new Map<string, { sum: number; n: number }>();
    for (const row of Object.values(mcqStats)) {
      const subj = findTopic(row.topicId)?.subject.hindiName;
      if (!subj) continue;
      const v = bySubject.get(subj) ?? { sum: 0, n: 0 };
      v.sum += row.lastAccuracyPct; v.n++;
      bySubject.set(subj, v);
    }
    const subjectAcc = [...bySubject].map(([name, v]) => ({ name, pct: Math.round(v.sum / v.n) })).sort((a, b) => a.pct - b.pct);
    return { topics, prevTopics, minutes, activeDays, mockCount: weekMocks.length, avgMockPct, weakest: subjectAcc[0] ?? null, strongest: subjectAcc.length > 1 ? subjectAcc[subjectAcc.length - 1] : null };
  }, [dailyLog, mocks, mcqStats]);

  const readiness = useMemo(
    () => computeReadiness({ completedTopics: completed, totalTopics: all.length, mcqStats }),
    [completed, all.length, mcqStats]
  );

  const subjectData = SYLLABUS.map(s => {
    const total = s.units.reduce((n, u) => n + u.topics.length, 0);
    const done = s.units.reduce((n, u) => n + u.topics.filter(t => topicStates[t.id]?.isCompleted).length, 0);
    return { name: s.name.split(" ")[0], done, total };
  });

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = dailyLog.find(x => x.date === key);
    return { day: `${d.getDate()}/${d.getMonth()+1}`, count: entry?.completedTopicIds.length ?? 0 };
  });

  const difficultyPie = (["आसान", "मध्यम", "कठिन"] as const).map(d => ({
    name: d,
    value: all.filter(r => topicStates[r.topic.id]?.difficulty === d).length,
  }));
  const diffColors = ["var(--color-easy)", "var(--color-medium)", "var(--color-hard)"];

  const achievements = [
    { id: "first", label: "पहला टॉपिक पूर्ण", icon: CheckCircle2, unlocked: completed >= 1 },
    { id: "ten", label: "10 टॉपिक्स पूर्ण", icon: Award, unlocked: completed >= 10 },
    { id: "fifty", label: "50 टॉपिक्स पूर्ण", icon: Award, unlocked: completed >= 50 },
    { id: "streak3", label: "3 दिन स्ट्रीक", icon: Flame, unlocked: streak.longest >= 3 },
    { id: "streak7", label: "7 दिन स्ट्रीक", icon: Flame, unlocked: streak.longest >= 7 },
    { id: "streak30", label: "30 दिन स्ट्रीक", icon: Trophy, unlocked: streak.longest >= 30 },
  ];

  return (
    <AppShell title="सांख्यिकी" subtitle="आपकी प्रगति का विश्लेषण" back>
      <div className="space-y-4">
        <div className="card-surface flex flex-col items-center gap-3 p-4">
          <h2 className="self-start text-sm font-bold">परीक्षा तैयारी स्कोर</h2>
          <CircularProgress value={readiness.score} label={readiness.label} sublabel={`${readiness.coveragePct}% syllabus · ${readiness.avgAccuracyPct}% accuracy`} />
          <ShareProgressCard completed={completed} total={all.length} streak={streak.longest} readinessScore={readiness.score} />
        </div>

        <div className="card-surface space-y-3 p-4">
          <h2 className="text-sm font-bold">इस हफ्ते की रिपोर्ट (पिछले 7 दिन)</h2>
          <div className="grid grid-cols-2 gap-2 text-center">
            <WeeklyStat value={String(weekly.topics)} label={`टॉपिक पूरे (पिछले हफ्ते ${weekly.prevTopics})`} />
            <WeeklyStat value={`${weekly.activeDays}/7`} label="पढ़ाई वाले दिन" />
            <WeeklyStat value={`${Math.floor(weekly.minutes / 60)}घं ${weekly.minutes % 60}मि`} label="पढ़ाई का समय" />
            <WeeklyStat value={weekly.avgMockPct == null ? String(weekly.mockCount) : `${weekly.avgMockPct}%`} label={weekly.avgMockPct == null ? "मॉक टेस्ट दिए" : `${weekly.mockCount} मॉक का औसत`} />
          </div>
          {weekly.weakest ? (
            <p className="text-xs text-muted-foreground">
              सबसे कमज़ोर विषय: <span className="font-bold text-rose-600">{weekly.weakest.name} ({weekly.weakest.pct}%)</span>
              {weekly.strongest && <>, सबसे मज़बूत: <span className="font-bold text-emerald-600">{weekly.strongest.name} ({weekly.strongest.pct}%)</span></>}
              {" "}(MCQ टेस्ट की सटीकता के आधार पर)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">टॉपिक के MCQ टेस्ट देने पर यहाँ कमज़ोर और मज़बूत विषय दिखेंगे।</p>
          )}
          {weekly.topics < weekly.prevTopics && (
            <p className="text-[11px] font-semibold text-amber-600">इस हफ्ते पिछले हफ्ते से कम टॉपिक पूरे हुए। रोज़ का लक्ष्य पूरा करने की कोशिश करें।</p>
          )}
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">अध्ययन हीटमैप (पिछले ~3 महीने)</h2>
          <StudyHeatmap dailyLog={dailyLog} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link to="/mock-test" className="card-surface flex flex-col items-center gap-1.5 p-3 text-center touch-tap">
            <ListChecks className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-semibold leading-tight">मॉक टेस्ट</span>
          </Link>
          <Link to="/wrong-answers" className="card-surface flex flex-col items-center gap-1.5 p-3 text-center touch-tap">
            <XCircle className="h-5 w-5 text-rose-500" />
            <span className="text-[11px] font-semibold leading-tight">गलत उत्तर बैंक</span>
          </Link>
          <Link to="/flashcards" className="card-surface flex flex-col items-center gap-1.5 p-3 text-center touch-tap">
            <Layers className="h-5 w-5 text-accent" />
            <span className="text-[11px] font-semibold leading-tight">फ्लैशकार्ड्स</span>
          </Link>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">पिछले 14 दिन</h2>
          <div className="h-40">
            <ResponsiveContainer>
              <LineChart data={last14} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">विषय-वार प्रगति</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={subjectData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="var(--color-muted)" radius={[4,4,0,0]} />
                <Bar dataKey="done" fill="var(--color-primary)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">कठिनाई वितरण</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={difficultyPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {difficultyPie.map((_, i) => <Cell key={i} fill={diffColors[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-3 text-xs">
            {difficultyPie.map((d, i) => (
              <span key={d.name} className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: diffColors[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        <div className="card-surface p-4">
          <h2 className="mb-3 text-sm font-bold">उपलब्धियाँ</h2>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="rounded-xl border border-border p-2.5 text-center"
                     style={{ opacity: a.unlocked ? 1 : 0.4, background: a.unlocked ? "color-mix(in oklab, var(--color-primary) 8%, transparent)" : "transparent" }}>
                  <Icon className="mx-auto h-6 w-6" style={{ color: a.unlocked ? "var(--color-primary)" : "var(--color-muted-foreground)" }} />
                  <div className="mt-1 text-[10px] font-semibold leading-tight">{a.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function WeeklyStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-2">
      <div className="text-lg font-black leading-none tabular-nums text-primary">{value}</div>
      <div className="mt-1 text-[10px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
