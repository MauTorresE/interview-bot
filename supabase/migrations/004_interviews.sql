-- Phase 3 Migration: Interviews and Transcript Entries
-- Follows patterns from 002_campaigns.sql and 003_move_to_entrevista_schema.sql

-- ============================================================
-- Interviews
-- ============================================================
CREATE TABLE entrevista.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES entrevista.campaigns(id) ON DELETE CASCADE NOT NULL,
  respondent_id UUID REFERENCES entrevista.respondents(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES entrevista.organizations(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  topics_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Transcript Entries
-- ============================================================
CREATE TABLE entrevista.transcript_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES entrevista.interviews(id) ON DELETE CASCADE NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('bot', 'client')),
  content TEXT NOT NULL,
  elapsed_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS: Interviews
-- ============================================================
ALTER TABLE entrevista.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_interviews" ON entrevista.interviews
  FOR SELECT USING (org_id = entrevista.get_org_id());

-- ============================================================
-- RLS: Transcript Entries
-- ============================================================
ALTER TABLE entrevista.transcript_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_transcripts" ON entrevista.transcript_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entrevista.interviews
      WHERE id = entrevista.transcript_entries.interview_id
      AND org_id = entrevista.get_org_id()
    )
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_interviews_campaign ON entrevista.interviews(campaign_id);
CREATE INDEX idx_interviews_respondent ON entrevista.interviews(respondent_id);
CREATE INDEX idx_interviews_status ON entrevista.interviews(status);
CREATE INDEX idx_transcript_interview ON entrevista.transcript_entries(interview_id);

-- ============================================================
-- Updated_at trigger (reuse existing function from 002)
-- ============================================================
CREATE TRIGGER interviews_updated_at
  BEFORE UPDATE ON entrevista.interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
