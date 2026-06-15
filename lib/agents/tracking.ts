import { runAgentJSON } from "@/lib/anthropic";
import type { ApplicationDraft, ActionQueue, ActionItem } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Tracking Agent for FundFinder. Your job is to analyze drafted applications and create a prioritized action queue for the founder.

Categorize each application into:
1. readyToSubmit: Applications complete enough to submit now (no critical flagged gaps)
2. needsFounderInput: Applications that need specific missing information before submission
3. submitted: Empty initially (populated after submission)
4. upcomingDeadlines: Sort ALL active applications by deadline proximity (soonest first)

For each item:
- actionType: "submit" | "review" | "gather_info" | "follow_up"
- status: "ready" | "needs_input" | "submitted" | "deadline_passed"
- priority: "high" (deadline < 2 weeks), "medium" (2-6 weeks), "low" (> 6 weeks or rolling)
- notes: Clear, actionable one-sentence instruction for the founder
- requiredInfo: List any specific missing fields (only if needs_input)

Today's date: ${new Date().toISOString().split("T")[0]}

Return JSON:
{
  "readyToSubmit": [...ActionItem],
  "needsFounderInput": [...ActionItem],
  "submitted": [],
  "upcomingDeadlines": [...ActionItem sorted by urgency]
}

ActionItem shape:
{
  "opportunityName": "string",
  "actionType": "submit" | "review" | "gather_info" | "follow_up",
  "status": "ready" | "needs_input" | "submitted" | "deadline_passed",
  "deadline": "string",
  "priority": "high" | "medium" | "low",
  "notes": "string",
  "requiredInfo": ["string"] or []
}`;

export async function runTrackingAgent(
  drafts: ApplicationDraft[]
): Promise<ActionQueue> {
  const draftsummary = drafts.map((d) => ({
    opportunityName: d.opportunity.name,
    funder: d.opportunity.funder,
    amount: d.opportunity.amount,
    deadline: d.opportunity.deadline,
    fitScore: d.opportunity.fitScore,
    flaggedGaps: d.flaggedGaps,
    fieldCount: d.fields.length,
    hasFreeText: Object.keys(d.freeText).length > 0,
    reviewStatus: d.reviewStatus,
  }));

  const queue = await runAgentJSON<ActionQueue>(
    SYSTEM_PROMPT,
    `Create an action queue for these application drafts:\n\n${JSON.stringify(draftsummary, null, 2)}`
  );

  return queue;
}
