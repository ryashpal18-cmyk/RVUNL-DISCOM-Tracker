import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GUIDE_INTRO, PREP_GUIDE } from "@/lib/syllabus/prepGuide";

export const Route = createFileRoute("/prep-guide")({
  head: () => ({
    meta: [
      { title: "तैयारी गाइड — RVUNL/DISCOM Tracker" },
      { name: "description", content: "जूनियर असिस्टेंट / कमर्शियल असिस्टेंट-II: चयन प्रक्रिया, Pre-Exam पैटर्न, टाइपिंग, 3 हफ्ते की योजना और परीक्षा के दिन की रणनीति।" },
    ],
  }),
  component: PrepGuidePage,
});

function PrepGuidePage() {
  return (
    <AppShell title="तैयारी गाइड" subtitle="जूनियर असिस्टेंट / कमर्शियल असिस्टेंट-II" back>
      <p className="mb-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">{GUIDE_INTRO}</p>
      <div className="card-surface px-3">
        <Accordion type="multiple" defaultValue={["pre"]} className="w-full">
          {PREP_GUIDE.map((sec, idx) => (
            <AccordionItem key={sec.id} value={sec.id} className={idx === PREP_GUIDE.length - 1 ? "border-b-0" : ""}>
              <AccordionTrigger className="text-sm">{sec.title}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-1">
                  {sec.code && (
                    <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed">{sec.code}</pre>
                  )}
                  {sec.rows && (
                    <dl className="space-y-1.5">
                      {sec.rows.map((r, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <dt className="w-28 shrink-0 font-semibold">{r.label}</dt>
                          <dd className="text-muted-foreground">
                            {r.value}
                            {r.trust === "official" && " ✅"}
                            {r.trust === "secondary" && " ⚠️"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {sec.table && (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {sec.table.head.map((h, i) => (
                              <th key={i} className="px-3 py-2 text-left font-bold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sec.table.rows.map((row, ri) => (
                            <tr key={ri} className={ri !== sec.table!.rows.length - 1 ? "border-b border-border" : ""}>
                              {row.map((c, ci) => (
                                <td key={ci} className="px-3 py-2 text-muted-foreground">{c}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {sec.bullets && (
                    <ul className="space-y-2">
                      {sec.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppShell>
  );
}
