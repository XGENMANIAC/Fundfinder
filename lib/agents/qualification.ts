import { runAgentJSON } from "@/lib/anthropic";
import type { FounderProfile, FundingOpportunity } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Qualification Agent for FundFinder.

Your job: Score each funding opportunity 0–100 against the founder profile and return a ranked shortlist.

Scoring rules:
1. HARD REQUIREMENTS (auto-disqualify if any fail):
   - Location mismatch → score = 0, disqualify
   - Stage mismatch → score = 0, disqualify
   - Legal status mismatch → score = 0, disqualify
   - Sector mismatch → score = 0, disqualify

2. SOFT FIT (for qualifying opportunities):
   - Amount alignment: does the ask match what they're seeking? (0–25 pts)
   - Mission match: does the funder's focus align with the business? (0–25 pts)
   - Competitiveness: how likely is this founder to win/be accepted? (0–25 pts)
   - Completeness: can we fill the application with available info? (0–25 pts)

3. Confidence:
   - High: score >= 75 and all hard requirements clearly met
   - Medium: score 50–74 or one soft requirement uncertain
   - Low: score < 50 or eligibility uncertain

Return ONLY opportunities with score > 0. Sort by score descending.

Return a JSON array:
[
  {
    "name": "string",
    "funder": "string",
    "amount": "string",
    "deadline": "string",
    "eligibility": "string",
    "applicationUrl": "string",
    "sourceUrl": "string",
    "fitScore": number,
    "confidence": "High" | "Medium" | "Low",
    "rationale": "string (one concise sentence explaining the score)",
    "status": "qualified"
  }
]`;

export async function runQualificationAgent(
  profile: FounderProfile,
  opportunities: FundingOpportunity[]
): Promise<FundingOpportunity[]> {
  const profileSummary = `
Founder: ${profile.name || "Unknown"}
Business: ${profile.businessName || "Unknown"}
Location: ${profile.location || "Unknown"}
Industry: ${profile.industry || "Unknown"}
Stage: ${profile.stage || "Unknown"}
Description: ${profile.description || "None"}
Traction: ${profile.traction || "None"}
Team Size: ${profile.teamSize ?? "Unknown"}
Funding Sought: ${profile.fundingAmount || "Unknown"}
Legal Structure: ${profile.legalStructure || "Unknown"}
Registration: ${profile.registrationStatus || "Unknown"}
Demographics: ${profile.demographics || "Not specified"}
`.trim();

  const oppsJson = JSON.stringify(opportunities, null, 2);

  const qualified = await runAgentJSON<FundingOpportunity[]>(
    SYSTEM_PROMPT,
    `Score and rank these opportunities for the following founder.\n\nFOUNDER PROFILE:\n${profileSummary}\n\nOPPORTUNITIES:\n${oppsJson}`
  );

  return qualified
    .filter((o) => (o.fitScore ?? 0) > 0)
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
}
