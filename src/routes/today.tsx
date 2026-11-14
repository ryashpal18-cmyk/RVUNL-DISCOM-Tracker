import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarClock, ListChecks } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TopicCard } from "@/components/TopicCard";
import { useData } from "@/lib/db/DataContext";
import { getAllTopics } from "@/lib/syllabus/syllabusData";
import { getPlanStatus } from "@/lib/syllabus/studyPlan";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "आज का लक्ष्य" }, { name: "description", content: "आज के दिन पूर्ण करने योग्य टॉपिक्स और 3 हफ्ते की योजना।" }] }),
  component: TodayPage,
});

function TodayPage() {
  const { topicStates, settings } = useData();
  const all = useMemo(() => getAllTopics(), []);
  const status = getPlanStatus(settings.examDate);
  const limit = Math.max(3, settings.dailyTargetTopics * 2);

  const { list, revisionMode } = useMemo(() => {
    const pending = all.filter(({ topic }) => !topicStates[topic.id]?.isCompleted);
    // हफ्ता 3: रिवीजन वाले और कमज़ोर (कठिन) टॉपिक पहले, फिर जो बचे हैं।
    if (status?.plan.week === 3) {
      const revise = all.filter(({ topic }) => {
        const s = topicStates[topic.id];
        return s?.isCompleted && (s.markedForRevision || s.difficulty === "कठिन");
      });
      return { list: [...revise, ...pending].slice(0, limit), revisionMode: true };
    }
    // हफ्ता 1/2: इस हफ्ते की यूनिट्स के टॉपिक पहले।
    const focus = new Set(status?.plan.focusUnitIds ?? []);
    const first = pending.filter(({ unit }) => focus.has(unit.id));
    const rest = pending.filter(({ unit }) => !focus.has(unit.id));
    return { list: [...first, ...rest].slice(0, limit), revisionMode: false };
  }, [all, topicStates, status?.plan.week, limit]);

  return (
    <AppShell title="आज का लक्ष्य" subtitle={`दैनिक लक्ष्य: ${settings.dailyTargetTopics} टॉपिक्स`} back>
      <div className="space-y-2.5">
        {status ? (
          <div className="card-surface space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{status.plan.title}</h2>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {status.days === 0 ? "आज परीक्षा" : `${status.days} दिन बाकी`}
              </span>
            </div>
            {status.early && (
              <p className="text-[11px] text-muted-foreground">
                परीक्षा 3 हफ्ते से ज़्यादा दूर है। तब तक हफ्ता 1 की बुनियाद पर काम करें।
              </p>
            )}
            {status.finalDays && (
              <p className="text-[11px] font-semibold text-amber-600">आख़िरी दिन: कोई नया टॉपिक नहीं, सिर्फ़ रिवीजन और पूरी नींद।</p>
            )}
            <ul className="space-y-1">
              {status.plan.tasks.map((t) => (
                <li key={t} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {status.plan.week === 3 && (
              <Link to="/mock-test" className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground">
                <ListChecks className="h-4 w-4" /> आज का मॉक टेस्ट दें
              </Link>
            )}
          </div>
        ) : (
          <Link to="/settings" className="card-surface flex items-center gap-3 p-3">
            <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-xs text-muted-foreground">
              सेटिंग में परीक्षा की तारीख़ डालें, तो यहाँ 3 हफ्ते की योजना के हिसाब से आज के टॉपिक दिखेंगे।
            </span>
          </Link>
        )}

        <h3 className="pt-1 text-sm font-bold">{revisionMode ? "आज रिवीजन करें" : "आज के टॉपिक"}</h3>
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">सभी टॉपिक्स पूर्ण हैं — बधाई हो!</p>
        ) : list.map(({ subject, unit, topic }) => (
          <TopicCard key={topic.id} topic={topic} contextLabel={`${subject.hindiName} › ${unit.title}`} />
        ))}
      </div>
    </AppShell>
  );
}
