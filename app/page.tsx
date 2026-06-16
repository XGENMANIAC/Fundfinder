"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Search, Star, Send } from "lucide-react";
import type { FounderProfile, PipelineEvent } from "@/lib/types";

const STEPS = [
  { icon: Search, label: "Discovery", desc: "Scanning grants, accelerators & programs" },
  { icon: Star, label: "Qualification", desc: "Scoring & ranking by eligibility" },
  { icon: Zap, label: "Application", desc: "Drafting tailored applications" },
  { icon: Send, label: "Tracking", desc: "Building your action queue" },
];

const STAGE_OPTIONS = ["idea", "pre-seed", "seed", "growth"] as const;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageMessage, setStageMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<FounderProfile>({
    name: "",
    email: "",
    businessName: "",
    location: "",
    industry: "",
    stage: "pre-seed",
    description: "",
    traction: "",
    teamSize: undefined,
    fundingAmount: "",
    useOfFunds: "",
    legalStructure: "",
    demographics: "",
  });

  const set = (field: keyof FounderProfile, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const stageIndex = STEPS.findIndex(
    (s) => s.label.toLowerCase() === currentStage
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCurrentStage("discovery");

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok || !res.body) {
        throw new Error("Pipeline request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sessionId = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          let event: PipelineEvent & { sessionId?: string; data?: unknown };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue; // skip malformed JSON only
          }

          if (event.stage === "error") {
            throw new Error(event.message || "Pipeline error");
          }

          if (event.stage !== "done") {
            setCurrentStage(event.stage);
            if (event.message) setStageMessage(event.message);
          }

          if (event.stage === "done" && event.sessionId) {
            sessionId = event.sessionId;
            // Cache full result in sessionStorage so dashboard works without DB
            if (event.data) {
              try {
                const d = event.data as {
                  qualified: Array<Record<string, unknown>>;
                  drafts: Array<Record<string, unknown>>;
                  actionQueue: {
                    readyToSubmit: Array<Record<string, unknown>>;
                    needsFounderInput: Array<Record<string, unknown>>;
                    submitted: Array<Record<string, unknown>>;
                  };
                };
                const toDb = {
                  profile: {
                    business_name: form.businessName,
                    name: form.name,
                    email: form.email,
                    location: form.location,
                    industry: form.industry,
                    stage: form.stage,
                  },
                  opportunities: d.qualified.map((o: Record<string, unknown>) => ({
                    name: o.name,
                    funder: o.funder,
                    amount: o.amount,
                    deadline: o.deadline,
                    eligibility: o.eligibility,
                    application_url: o.applicationUrl,
                    source_url: o.sourceUrl,
                    fit_score: o.fitScore,
                    confidence: o.confidence,
                    rationale: o.rationale,
                    status: o.status,
                  })),
                  drafts: d.drafts.map((dr: Record<string, unknown>) => {
                    const opp = dr.opportunity as Record<string, unknown>;
                    return {
                      opportunity_name: opp?.name,
                      funder: opp?.funder,
                      fields: dr.fields,
                      free_text: dr.freeText,
                      flagged_gaps: dr.flaggedGaps,
                      review_status: dr.reviewStatus,
                    };
                  }),
                  actions: [
                    ...d.actionQueue.readyToSubmit,
                    ...d.actionQueue.needsFounderInput,
                    ...d.actionQueue.submitted,
                  ].map((a: Record<string, unknown>) => ({
                    opportunity_name: a.opportunityName,
                    action_type: a.actionType,
                    status: a.status,
                    deadline: a.deadline,
                    priority: a.priority,
                    notes: a.notes,
                    required_info: a.requiredInfo || [],
                  })),
                };
                sessionStorage.setItem(`ff_${sessionId}`, JSON.stringify(toDb));
              } catch {
                // sessionStorage unavailable — dashboard will try DB
              }
            }
          }
        }
      }

      if (sessionId) {
        router.push(`/dashboard/${sessionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setCurrentStage(null);
    }
  }

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs text-blue-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            4-Agent AI Pipeline
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
            Find your <span className="gradient-text">funding</span>,<br />
            automatically.
          </h1>
          <p className="text-white/50 text-base max-w-lg mx-auto">
            Tell us about your startup. Our AI discovers matching grants, accelerators, and programs — then drafts your applications.
          </p>
        </div>

        {/* Pipeline Steps */}
        {loading ? (
          <div className="glass rounded-2xl p-8 mb-8">
            <p className="text-white/50 text-xs uppercase tracking-widest text-center mb-6">Running Pipeline</p>
            <div className="flex justify-between relative">
              <div className="absolute top-5 left-8 right-8 h-px bg-white/10" />
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === stageIndex;
                const isDone = i < stageIndex;
                return (
                  <div key={step.label} className="flex flex-col items-center gap-2 relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isDone
                          ? "bg-green-500/20 border border-green-500/50"
                          : isActive
                          ? "bg-blue-500/20 border border-blue-500 animate-pulse"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      {isDone ? (
                        <span className="text-green-400 text-sm">✓</span>
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-white/30"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {stageMessage && (
              <p className="text-center text-white/40 text-xs mt-4">{stageMessage}</p>
            )}
          </div>
        ) : null}

        {/* Form */}
        {!loading && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="glass border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Section: You */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">About You</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Your Name" required>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Jane Doe"
                    className="input"
                    required
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="jane@startup.com"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <Field label="Demographics (optional)" hint="e.g. Woman-led, minority-led, veteran — unlocks eligibility-gated grants">
                <input
                  type="text"
                  value={form.demographics || ""}
                  onChange={(e) => set("demographics", e.target.value)}
                  placeholder="e.g. Woman-led, Black founder"
                  className="input"
                />
              </Field>
            </div>

            {/* Section: Business */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Your Business</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Name" required>
                  <input
                    type="text"
                    value={form.businessName || ""}
                    onChange={(e) => set("businessName", e.target.value)}
                    placeholder="Acme Inc."
                    className="input"
                    required
                  />
                </Field>
                <Field label="Location (Country / City)" required>
                  <input
                    type="text"
                    value={form.location || ""}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Kenya / Nairobi"
                    className="input"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Industry / Sector" required>
                  <input
                    type="text"
                    value={form.industry || ""}
                    onChange={(e) => set("industry", e.target.value)}
                    placeholder="Fintech, Agritech, Health..."
                    className="input"
                    required
                  />
                </Field>
                <Field label="Stage" required>
                  <select
                    value={form.stage || "pre-seed"}
                    onChange={(e) => set("stage", e.target.value)}
                    className="input"
                  >
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Business Description" required hint="What do you do, for whom, and why it matters">
                <textarea
                  value={form.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="We build AI-powered crop disease detection for smallholder farmers in East Africa..."
                  rows={3}
                  className="input resize-none"
                  required
                />
              </Field>
            </div>

            {/* Section: Traction */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Traction & Team</h2>
              <Field label="Traction / Key Metrics" hint="Revenue, users, MRR, pilots, partnerships — whatever you have">
                <textarea
                  value={form.traction || ""}
                  onChange={(e) => set("traction", e.target.value)}
                  placeholder="500 active farmers, $8K MRR, 3 pilot agreements with NGOs..."
                  rows={2}
                  className="input resize-none"
                />
              </Field>
              <Field label="Team Size">
                <input
                  type="number"
                  value={form.teamSize || ""}
                  onChange={(e) => set("teamSize", parseInt(e.target.value) || undefined)}
                  placeholder="3"
                  min={1}
                  className="input"
                />
              </Field>
            </div>

            {/* Section: Funding */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Funding</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount Seeking" required>
                  <input
                    type="text"
                    value={form.fundingAmount || ""}
                    onChange={(e) => set("fundingAmount", e.target.value)}
                    placeholder="$50,000"
                    className="input"
                    required
                  />
                </Field>
                <Field label="Legal Structure">
                  <input
                    type="text"
                    value={form.legalStructure || ""}
                    onChange={(e) => set("legalStructure", e.target.value)}
                    placeholder="LLC, Ltd, sole trader..."
                    className="input"
                  />
                </Field>
              </div>
              <Field label="Use of Funds" required>
                <textarea
                  value={form.useOfFunds || ""}
                  onChange={(e) => set("useOfFunds", e.target.value)}
                  placeholder="60% product development, 30% market expansion, 10% ops..."
                  rows={2}
                  className="input resize-none"
                  required
                />
              </Field>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
            >
              <Zap className="w-4 h-4" />
              Run FundFinder Pipeline
            </button>
          </form>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input::placeholder { color: rgba(255,255,255,0.25); }
        .input:focus { border-color: rgba(96,165,250,0.5); }
        select.input option { background: #0f172a; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/60">
        {label}
        {required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}
