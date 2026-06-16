import { createClient } from "@supabase/supabase-js";
import type { FounderProfile, FundingOpportunity, ApplicationDraft, ActionItem } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceKey || supabaseKey
);

export async function saveFounderProfile(profile: FounderProfile, sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("ff_founder_profiles").insert({
    session_id: sessionId,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    business_name: profile.businessName,
    location: profile.location,
    industry: profile.industry,
    stage: profile.stage,
    description: profile.description,
    traction: profile.traction,
    team_size: profile.teamSize,
    funding_amount: profile.fundingAmount,
    use_of_funds: profile.useOfFunds,
    legal_structure: profile.legalStructure,
    registration_status: profile.registrationStatus,
    demographics: profile.demographics,
    assumptions: profile.assumptions || [],
    missing_fields: profile.missingFields || [],
  });
  if (error) throw error;
}

export async function saveOpportunities(
  sessionId: string,
  opportunities: FundingOpportunity[]
): Promise<void> {
  const rows = opportunities.map((opp) => ({
    session_id: sessionId,
    name: opp.name,
    funder: opp.funder,
    amount: opp.amount,
    deadline: opp.deadline,
    eligibility: opp.eligibility,
    application_url: opp.applicationUrl,
    source_url: opp.sourceUrl,
    fit_score: opp.fitScore,
    confidence: opp.confidence,
    rationale: opp.rationale,
    status: opp.status || "discovered",
  }));
  const { error } = await supabaseAdmin.from("ff_opportunities").insert(rows);
  if (error) throw error;
}

export async function saveApplicationDrafts(
  sessionId: string,
  drafts: ApplicationDraft[]
): Promise<void> {
  const rows = drafts.map((d) => ({
    session_id: sessionId,
    opportunity_name: d.opportunity.name,
    funder: d.opportunity.funder,
    fields: d.fields,
    free_text: d.freeText,
    flagged_gaps: d.flaggedGaps,
    review_status: d.reviewStatus,
  }));
  const { error } = await supabaseAdmin.from("ff_application_drafts").insert(rows);
  if (error) throw error;
}

export async function saveActionQueue(
  sessionId: string,
  items: ActionItem[]
): Promise<void> {
  const rows = items.map((item) => ({
    session_id: sessionId,
    opportunity_name: item.opportunityName,
    action_type: item.actionType,
    status: item.status,
    deadline: item.deadline,
    priority: item.priority,
    notes: item.notes,
    required_info: item.requiredInfo || [],
  }));
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from("ff_action_queue").insert(rows);
  if (error) throw error;
}

export async function getSession(sessionId: string) {
  const [profile, opportunities, drafts, actions] = await Promise.all([
    supabaseAdmin.from("ff_founder_profiles").select("*").eq("session_id", sessionId).single(),
    supabaseAdmin.from("ff_opportunities").select("*").eq("session_id", sessionId).order("fit_score", { ascending: false }),
    supabaseAdmin.from("ff_application_drafts").select("*").eq("session_id", sessionId),
    supabaseAdmin.from("ff_action_queue").select("*").eq("session_id", sessionId),
  ]);
  return {
    profile: profile.data,
    opportunities: opportunities.data || [],
    drafts: drafts.data || [],
    actions: actions.data || [],
  };
}
