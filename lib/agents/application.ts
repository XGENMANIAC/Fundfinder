import { runAgentJSON } from "@/lib/anthropic";
import type { FounderProfile, FundingOpportunity, ApplicationDraft } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Application Agent for FundFinder. Your job is to draft complete, compelling funding applications tailored to each funder's priorities.

Rules:
- Map ALL available founder data to application fields
- Write free-text answers (problem, solution, traction, use of funds, why-us) that are compelling and specific to this funder's stated mission and priorities
- Tailor language to the funder type: grants use impact language, VCs use growth language, gov schemes use economic/social impact language
- NEVER fabricate metrics, financials, team credentials, or specific numbers not provided
- Flag any required field you cannot fill with [FLAGGED: description of what's needed]
- Keep answers concise and punchy — quality over length
- Word counts: problem/solution ~150 words, traction ~100 words, use-of-funds ~100 words, why-us ~100 words

Return a JSON object with this shape:
{
  "fields": [
    { "field": "string", "value": "string", "flagged": boolean, "note": "string or null" }
  ],
  "freeText": {
    "problem": "string",
    "solution": "string",
    "traction": "string",
    "useOfFunds": "string",
    "whyUs": "string",
    "additionalSections": [{ "label": "string", "content": "string" }]
  },
  "flaggedGaps": ["string array of missing info items"],
  "reviewStatus": "draft"
}`;

export async function runApplicationAgent(
  profile: FounderProfile,
  opportunities: FundingOpportunity[]
): Promise<ApplicationDraft[]> {
  const topOpportunities = opportunities.slice(0, 5);

  const drafts: ApplicationDraft[] = [];

  for (const opp of topOpportunities) {
    const profileSummary = `
Founder Name: ${profile.name || "[MISSING]"}
Email: ${profile.email || "[MISSING]"}
Phone: ${profile.phone || "[MISSING]"}
Business Name: ${profile.businessName || "[MISSING]"}
Location: ${profile.location || "[MISSING]"}
Industry: ${profile.industry || "[MISSING]"}
Stage: ${profile.stage || "[MISSING]"}
Business Description: ${profile.description || "[MISSING]"}
Traction/Metrics: ${profile.traction || "[MISSING]"}
Team Size: ${profile.teamSize || "[MISSING]"}
Funding Amount Sought: ${profile.fundingAmount || "[MISSING]"}
Use of Funds: ${profile.useOfFunds || "[MISSING]"}
Legal Structure: ${profile.legalStructure || "[MISSING]"}
Registration Status: ${profile.registrationStatus || "[MISSING]"}
Demographics: ${profile.demographics || "Not specified"}
`.trim();

    const oppSummary = `
Opportunity: ${opp.name}
Funder: ${opp.funder}
Amount: ${opp.amount}
Deadline: ${opp.deadline}
Eligibility: ${opp.eligibility}
Application URL: ${opp.applicationUrl}
Fit Score: ${opp.fitScore}/100 (${opp.confidence} confidence)
`.trim();

    try {
      const draftData = await runAgentJSON<Omit<ApplicationDraft, "opportunity" | "sessionId" | "opportunityId">>(
        SYSTEM_PROMPT,
        `Draft a complete application for this opportunity.

FOUNDER PROFILE:
${profileSummary}

TARGET OPPORTUNITY:
${oppSummary}`
      );

      drafts.push({
        ...draftData,
        opportunity: opp,
        reviewStatus: "draft",
      });
    } catch (err) {
      drafts.push({
        opportunity: opp,
        fields: [],
        freeText: {},
        flaggedGaps: ["Failed to generate draft — please retry"],
        reviewStatus: "draft",
      });
    }
  }

  return drafts;
}
