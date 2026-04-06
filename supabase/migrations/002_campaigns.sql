-- Phase 2 Migration: Campaigns, Research Briefs, Respondents
-- Follows patterns from 001_foundation.sql

-- ============================================================
-- Campaigns
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  language TEXT DEFAULT 'es-419',
  duration_target_minutes INT DEFAULT 15 CHECK (duration_target_minutes IN (10, 15, 30)),
  voice_provider TEXT DEFAULT 'voxtral' CHECK (voice_provider IN ('voxtral', 'elevenlabs')),
  voice_id TEXT,
  interviewer_style TEXT DEFAULT 'professional' CHECK (interviewer_style IN ('professional', 'casual', 'empathetic', 'direct')),
  reusable_invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  reusable_invite_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Research Briefs (1:1 with campaigns)
-- ============================================================
CREATE TABLE research_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  brief_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE research_briefs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Respondents
-- ============================================================
CREATE TABLE respondents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'in_progress', 'completed', 'dropped')),
  consent_given_at TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE respondents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: campaigns
-- ============================================================
CREATE POLICY "org_members_can_view_campaigns" ON campaigns
  FOR SELECT USING (org_id = get_org_id());

CREATE POLICY "org_members_can_insert_campaigns" ON campaigns
  FOR INSERT WITH CHECK (org_id = get_org_id());

CREATE POLICY "org_members_can_update_campaigns" ON campaigns
  FOR UPDATE USING (org_id = get_org_id());

CREATE POLICY "org_members_can_delete_campaigns" ON campaigns
  FOR DELETE USING (org_id = get_org_id());

-- ============================================================
-- RLS Policies: research_briefs
-- ============================================================
CREATE POLICY "org_members_can_view_briefs" ON research_briefs
  FOR SELECT USING (org_id = get_org_id());

CREATE POLICY "org_members_can_insert_briefs" ON research_briefs
  FOR INSERT WITH CHECK (org_id = get_org_id());

CREATE POLICY "org_members_can_update_briefs" ON research_briefs
  FOR UPDATE USING (org_id = get_org_id());

-- ============================================================
-- RLS Policies: respondents
-- ============================================================
CREATE POLICY "org_members_can_view_respondents" ON respondents
  FOR SELECT USING (org_id = get_org_id());

CREATE POLICY "org_members_can_insert_respondents" ON respondents
  FOR INSERT WITH CHECK (org_id = get_org_id());

CREATE POLICY "org_members_can_update_respondents" ON respondents
  FOR UPDATE USING (org_id = get_org_id());

CREATE POLICY "org_members_can_delete_respondents" ON respondents
  FOR DELETE USING (org_id = get_org_id());

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER research_briefs_updated_at
  BEFORE UPDATE ON research_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
