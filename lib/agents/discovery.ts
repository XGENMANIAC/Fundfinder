import { runAgentJSON } from "@/lib/anthropic";
import type { FounderProfile, FundingOpportunity } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Discovery Agent for FundFinder, a system that finds funding opportunities for founders.

Your job: Given a founder profile, identify 8–12 REAL, currently-active funding opportunities (grants, accelerators, VC programs, government schemes, competitions, revenue-based financing) that plausibly match their location, stage, and sector.

Rules:
- Match on location (country/region), stage, and sector FIRST
- Include diverse types: grants, accelerators, angel/VC programs, gov schemes, competitions
- Provide realistic deadlines (rolling or specific dates near today: June 2026)
- Every opportunity must have a plausible application URL and source URL
- Do NOT include obviously expired programs
- Be specific about amounts (e.g. "Up to $50,000" not just "funding available")
- Eligibility must be specific and checkable

Return a JSON array with this exact shape:
[
  {
    "name": "string",
    "funder": "string",
    "amount": "string",
    "deadline": "string (e.g. 'Rolling' or 'August 15, 2026')",
    "eligibility": "string (concise, bullet-style requirements)",
    "applicationUrl": "string (realistic URL)",
    "sourceUrl": "string (realistic source URL)",
    "status": "discovered"
  }
]`;

export async function runDiscoveryAgent(
  profile: FounderProfile
): Promise<FundingOpportunity[]> {
  const profileSummary = `
Founder: ${profile.name || "Unknown"}
Business: ${profile.businessName || "Unknown"}
Location: ${profile.location || "Unknown"}
Industry: ${profile.industry || "Unknown"}
Stage: ${profile.stage || "Unknown"}
Description: ${profile.description || "None provided"}
Traction: ${profile.traction || "None provided"}
Team Size: ${profile.teamSize || "Unknown"}
Funding Sought: ${profile.fundingAmount || "Unknown"}
Use of Funds: ${profile.useOfFunds || "Unknown"}
Legal Structure: ${profile.legalStructure || "Unknown"}
Demographics: ${profile.demographics || "Not specified"}
`.trim();

  const opportunities = await runAgentJSON<FundingOpportunity[]>(
    SYSTEM_PROMPT,
    `Find funding opportunities for this founder:\n\n${profileSummary}`
  );

  return opportunities.map((opp) => ({ ...opp, status: "discovered" as const }));
}
