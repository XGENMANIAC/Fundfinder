"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock, ArrowLeft } from "lucide-react";
import type { FundingOpportunity, ApplicationDraft, ActionItem } from "@/lib/types";

interface SessionData {
  profile: Record<string, string>;
  opportunities: Array<Record<string, unknown>>;
  drafts: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
}

export default function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null);

  useEffect(() => {
    const fromStorage = (): SessionData | null => {
      try {
        const cached = sessionStorage.getItem(`ff_${sessionId}`);
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    };

    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.profile) {
          setData(d);
        } else {
          const cached = fromStorage();
          if (cached) setData(cached);
          else setError("Session not found");
        }
        setLoading(false);
      })
      .catch(() => {
        const cached = fromStorage();
        if (cached) { setData(cached); }
        else setError("Failed to load session");
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) return <Loader />;
  if (error || !data) return <ErrorState msg={error} />;

  const opportunities: FundingOpportunity[] = data.opportunities.map((o) => ({
    name: o.name as string,
    funder: o.funder as string,
    amount: o.amount as string,
    deadline: o.deadline as string,
    eligibility: o.eligibility as string,
    applicationUrl: o.application_url as string,
    sourceUrl: o.source_url as string,
    fitScore: o.fit_score as number,
    confidence: o.confidence as "High" | "Medium" | "Low",
    rationale: o.rationale as string,
    status: o.status as FundingOpportunity["status"],
  }));

  const drafts: ApplicationDraft[] = data.drafts.map((d) => ({
    opportunity: { name: d.opportunity_name as string, funder: d.funder as string } as FundingOpportunity,
    fields: (d.fields as ApplicationDraft["fields"]) || [],
    freeText: (d.free_text as ApplicationDraft["freeText"]) || {},
    flaggedGaps: (d.flagged_gaps as string[]) || [],
    reviewStatus: d.review_status as ApplicationDraft["reviewStatus"],
  }));

  const actions: ActionItem[] = data.actions.map((a) => ({
    opportunityName: a.opportunity_name as string,
    actionType: a.action_type as ActionItem["actionType"],
    status: a.status as ActionItem["status"],
    deadline: a.deadline as string,
    priority: a.priority as ActionItem["priority"],
    notes: a.notes as string,
    requiredInfo: (a.required_info as string[]) || [],
  }));

  const readyActions = actions.filter((a) => a.status === "ready");
  const needsInputActions = actions.filter((a) => a.status === "needs_input");

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-3 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> New Search
            </button>
            <h1 className="text-2xl font-bold text-white">Your Funding Report</h1>
            <p className="text-white/40 text-sm mt-1">
              {data.profile?.business_name || "Your business"} · {opportunities.length} opportunities found
            </p>
          </div>
          <div className="flex gap-3">
            <StatCard label="Qualified" value={opportunities.length} color="blue" />
            <StatCard label="Ready to Submit" value={readyActions.length} color="green" />
            <StatCard label="Needs Input" value={needsInputActions.length} color="amber" />
          </div>
        </div>

        {/* Action Queue */}
        {(readyActions.length > 0 || needsInputActions.length > 0) && (
          <section>
            <SectionHeader title="Action Queue" subtitle="What to do right now" />
            <div className="space-y-3">
              {readyActions.map((item, i) => <ActionCard key={i} item={item} />)}
              {needsInputActions.map((item, i) => <ActionCard key={i} item={item} />)}
            </div>
          </section>
        )}

        {/* Opportunities Table */}
        <section>
          <SectionHeader title="Ranked Opportunities" subtitle="Sorted by eligibility fit score" />
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Name / Funder", "Amount", "Deadline", "Fit", "Confidence", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm">{opp.name}</div>
                      <div className="text-white/40 text-xs">{opp.funder}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70 text-xs">{opp.amount}</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{opp.deadline}</td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={opp.fitScore || 0} />
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge confidence={opp.confidence || "Low"} />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={opp.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                      >
                        Apply <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Application Drafts */}
        {drafts.length > 0 && (
          <section>
            <SectionHeader title="Application Drafts" subtitle="Review-ready — edit before submitting" />
            <div className="space-y-3">
              {drafts.map((draft, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDraft(expandedDraft === i ? null : i)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white text-sm">{draft.opportunity.name}</div>
                      <div className="text-white/40 text-xs mt-0.5">{draft.opportunity.funder}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {draft.flaggedGaps.length > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {draft.flaggedGaps.length} gap{draft.flaggedGaps.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-white/20 bg-white/5 text-xs px-2 py-0.5 rounded-full">{draft.reviewStatus}</span>
                      {expandedDraft === i ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                    </div>
                  </button>

                  {expandedDraft === i && (
                    <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">
                      {/* Flagged Gaps */}
                      {draft.flaggedGaps.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <p className="text-amber-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Missing Information
                          </p>
                          <ul className="space-y-1">
                            {draft.flaggedGaps.map((gap, j) => (
                              <li key={j} className="text-amber-300/70 text-xs">• {gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Free Text Sections */}
                      {Object.entries(draft.freeText).map(([key, val]) => {
                        if (!val || key === "additionalSections") return null;
                        return (
                          <div key={key}>
                            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </p>
                            <div className="bg-white/3 rounded-xl p-4 text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                              {val as string}
                            </div>
                          </div>
                        );
                      })}

                      {/* Additional Sections */}
                      {draft.freeText.additionalSections?.map((s, j) => (
                        <div key={j}>
                          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{s.label}</p>
                          <div className="bg-white/3 rounded-xl p-4 text-white/70 text-sm leading-relaxed">{s.content}</div>
                        </div>
                      ))}

                      {/* Field Mappings */}
                      {draft.fields.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Form Fields</p>
                          <div className="space-y-2">
                            {draft.fields.map((f, j) => (
                              <div key={j} className={`flex gap-3 text-xs rounded-lg p-3 ${f.flagged ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/3"}`}>
                                <span className="text-white/40 min-w-32 shrink-0">{f.field}</span>
                                <span className="text-white/80">{f.value}</span>
                                {f.note && <span className="text-amber-400 ml-auto shrink-0">{f.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/40 text-sm">Loading your report...</p>
      </div>
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-8 text-center max-w-md">
        <p className="text-red-400 text-sm">{msg || "Session not found"}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-white/40 text-xs">{subtitle}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    amber: "text-amber-400",
  };
  return (
    <div className="glass rounded-xl px-4 py-3 text-center min-w-[80px]">
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-white/30 text-xs">{label}</div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

function ConfidenceBadge({ confidence }: { confidence: "High" | "Medium" | "Low" }) {
  const styles: Record<string, string> = {
    High: "bg-green-500/10 text-green-400 border-green-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Low: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[confidence]}`}>
      {confidence}
    </span>
  );
}

function ActionCard({ item }: { item: ActionItem }) {
  const priorityColors: Record<string, string> = {
    high: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-blue-500",
  };
  const isReady = item.status === "ready";

  return (
    <div className={`glass rounded-xl p-4 border-l-2 ${priorityColors[item.priority]} flex items-start justify-between gap-4`}>
      <div className="flex items-start gap-3">
        {isReady ? (
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        )}
        <div>
          <p className="text-white text-sm font-medium">{item.opportunityName}</p>
          <p className="text-white/50 text-xs mt-0.5">{item.notes}</p>
          {item.requiredInfo && item.requiredInfo.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {item.requiredInfo.map((info, i) => (
                <li key={i} className="text-amber-300/60 text-xs">• {info}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 text-white/40 text-xs">
          <Clock className="w-3 h-3" />
          {item.deadline}
        </div>
        <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${item.priority === "high" ? "bg-red-500/10 text-red-400" : item.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"}`}>
          {item.priority}
        </span>
      </div>
    </div>
  );
}
