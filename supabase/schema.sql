-- FundFinder schema (prefixed with ff_ to avoid conflicts)

CREATE TABLE IF NOT EXISTS ff_founder_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  business_name TEXT,
  location TEXT,
  industry TEXT,
  stage TEXT,
  description TEXT,
  traction TEXT,
  team_size INTEGER,
  funding_amount TEXT,
  use_of_funds TEXT,
  legal_structure TEXT,
  registration_status TEXT,
  demographics TEXT,
  assumptions TEXT[] DEFAULT '{}',
  missing_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ff_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ff_founder_profiles(session_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  funder TEXT NOT NULL,
  amount TEXT,
  deadline TEXT,
  eligibility TEXT,
  application_url TEXT,
  source_url TEXT,
  fit_score INTEGER,
  confidence TEXT,
  rationale TEXT,
  status TEXT DEFAULT 'discovered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ff_application_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ff_founder_profiles(session_id) ON DELETE CASCADE,
  opportunity_name TEXT NOT NULL,
  funder TEXT,
  fields JSONB DEFAULT '[]',
  free_text JSONB DEFAULT '{}',
  flagged_gaps TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ff_action_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES ff_founder_profiles(session_id) ON DELETE CASCADE,
  opportunity_name TEXT NOT NULL,
  action_type TEXT,
  status TEXT DEFAULT 'ready',
  deadline TEXT,
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  required_info TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ff_founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ff_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ff_application_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ff_action_queue ENABLE ROW LEVEL SECURITY;

-- Allow all ops via service role (API server uses service role key)
CREATE POLICY "service_role_all" ON ff_founder_profiles FOR ALL USING (true);
CREATE POLICY "service_role_all" ON ff_opportunities FOR ALL USING (true);
CREATE POLICY "service_role_all" ON ff_application_drafts FOR ALL USING (true);
CREATE POLICY "service_role_all" ON ff_action_queue FOR ALL USING (true);
