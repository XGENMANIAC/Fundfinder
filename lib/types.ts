export interface FounderProfile {
  id?: string;
  sessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  location?: string;
  industry?: string;
  stage?: "idea" | "pre-seed" | "seed" | "growth";
  description?: string;
  traction?: string;
  teamSize?: number;
  fundingAmount?: string;
  useOfFunds?: string;
  legalStructure?: string;
  registrationStatus?: string;
  demographics?: string;
  assumptions?: string[];
  missingFields?: string[];
}

export interface FundingOpportunity {
  id?: string;
  sessionId?: string;
  name: string;
  funder: string;
  amount: string;
  deadline: string;
  eligibility: string;
  applicationUrl: string;
  sourceUrl: string;
  fitScore?: number;
  confidence?: "High" | "Medium" | "Low";
  rationale?: string;
  status?: "discovered" | "qualified" | "disqualified" | "applied" | "submitted";
}

export interface ApplicationField {
  field: string;
  value: string;
  flagged?: boolean;
  note?: string;
}

export interface ApplicationDraft {
  id?: string;
  opportunityId?: string;
  sessionId?: string;
  opportunity: FundingOpportunity;
  fields: ApplicationField[];
  freeText: {
    problem?: string;
    solution?: string;
    traction?: string;
    useOfFunds?: string;
    whyUs?: string;
    additionalSections?: { label: string; content: string }[];
  };
  flaggedGaps: string[];
  reviewStatus: "draft" | "awaiting_review" | "approved" | "submitted";
}

export interface ActionItem {
  id?: string;
  sessionId?: string;
  opportunityId?: string;
  opportunityName: string;
  actionType: "submit" | "review" | "gather_info" | "follow_up";
  status: "ready" | "needs_input" | "submitted" | "deadline_passed";
  deadline: string;
  priority: "high" | "medium" | "low";
  notes: string;
  requiredInfo?: string[];
}

export interface ActionQueue {
  readyToSubmit: ActionItem[];
  needsFounderInput: ActionItem[];
  submitted: ActionItem[];
  upcomingDeadlines: ActionItem[];
}

export interface PipelineResult {
  sessionId: string;
  profile: FounderProfile;
  opportunities: FundingOpportunity[];
  qualifiedOpportunities: FundingOpportunity[];
  applicationDrafts: ApplicationDraft[];
  actionQueue: ActionQueue;
  summary: {
    totalDiscovered: number;
    totalQualified: number;
    totalDrafted: number;
    readyToSubmit: number;
    assumptions: string[];
    missingFields: string[];
  };
}

export type PipelineStage = "discovery" | "qualification" | "application" | "tracking" | "done" | "error";

export interface PipelineEvent {
  stage: PipelineStage;
  status: "running" | "complete" | "error";
  message?: string;
  data?: unknown;
  sessionId?: string;
}
