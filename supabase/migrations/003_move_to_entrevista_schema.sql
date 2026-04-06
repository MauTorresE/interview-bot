-- Move all EntrevistaAI tables from public to entrevista schema
-- This keeps the public schema clean for other projects sharing this Supabase instance

-- ============================================================
-- Create schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS entrevista;

-- ============================================================
-- Move helper function
-- ============================================================
CREATE OR REPLACE FUNCTION entrevista.get_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT ((SELECT auth.jwt()) -> 'app_metadata' ->> 'org_id')::UUID
$$;

-- ============================================================
-- Move Phase 1 tables
-- ============================================================
ALTER TABLE public.organizations SET SCHEMA entrevista;
ALTER TABLE public.org_members SET SCHEMA entrevista;
ALTER TABLE public.org_invites SET SCHEMA entrevista;

-- ============================================================
-- Move Phase 2 tables
-- ============================================================
ALTER TABLE public.campaigns SET SCHEMA entrevista;
ALTER TABLE public.research_briefs SET SCHEMA entrevista;
ALTER TABLE public.respondents SET SCHEMA entrevista;

-- ============================================================
-- Update RLS policies to use entrevista.get_org_id()
-- ============================================================

-- Drop old policies that reference public.get_org_id()
-- Organizations
DROP POLICY IF EXISTS "org_members_can_view_own_org" ON entrevista.organizations;
DROP POLICY IF EXISTS "authenticated_can_insert_org" ON entrevista.organizations;

-- Org members
DROP POLICY IF EXISTS "org_members_can_view_members" ON entrevista.org_members;
DROP POLICY IF EXISTS "owners_can_manage_members" ON entrevista.org_members;
DROP POLICY IF EXISTS "user_can_insert_own_membership" ON entrevista.org_members;

-- Org invites
DROP POLICY IF EXISTS "org_members_can_view_invites" ON entrevista.org_invites;
DROP POLICY IF EXISTS "org_members_can_create_invites" ON entrevista.org_invites;
DROP POLICY IF EXISTS "invitee_can_view_own_invite" ON entrevista.org_invites;

-- Campaigns
DROP POLICY IF EXISTS "org_members_can_view_campaigns" ON entrevista.campaigns;
DROP POLICY IF EXISTS "org_members_can_insert_campaigns" ON entrevista.campaigns;
DROP POLICY IF EXISTS "org_members_can_update_campaigns" ON entrevista.campaigns;
DROP POLICY IF EXISTS "org_members_can_delete_campaigns" ON entrevista.campaigns;

-- Research briefs
DROP POLICY IF EXISTS "org_members_can_view_briefs" ON entrevista.research_briefs;
DROP POLICY IF EXISTS "org_members_can_insert_briefs" ON entrevista.research_briefs;
DROP POLICY IF EXISTS "org_members_can_update_briefs" ON entrevista.research_briefs;

-- Respondents
DROP POLICY IF EXISTS "org_members_can_view_respondents" ON entrevista.respondents;
DROP POLICY IF EXISTS "org_members_can_insert_respondents" ON entrevista.respondents;
DROP POLICY IF EXISTS "org_members_can_update_respondents" ON entrevista.respondents;
DROP POLICY IF EXISTS "org_members_can_delete_respondents" ON entrevista.respondents;

-- ============================================================
-- Recreate all RLS policies with entrevista.get_org_id()
-- ============================================================

-- Organizations
CREATE POLICY "org_members_can_view_own_org" ON entrevista.organizations
  FOR SELECT USING (id = entrevista.get_org_id());

CREATE POLICY "authenticated_can_insert_org" ON entrevista.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Org members
CREATE POLICY "org_members_can_view_members" ON entrevista.org_members
  FOR SELECT USING (org_id = entrevista.get_org_id());

CREATE POLICY "owners_can_manage_members" ON entrevista.org_members
  FOR ALL USING (
    org_id = entrevista.get_org_id()
    AND EXISTS (
      SELECT 1 FROM entrevista.org_members
      WHERE org_id = entrevista.get_org_id()
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

CREATE POLICY "user_can_insert_own_membership" ON entrevista.org_members
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Org invites
CREATE POLICY "org_members_can_view_invites" ON entrevista.org_invites
  FOR SELECT USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_create_invites" ON entrevista.org_invites
  FOR INSERT WITH CHECK (org_id = entrevista.get_org_id());

CREATE POLICY "invitee_can_view_own_invite" ON entrevista.org_invites
  FOR SELECT USING (
    email = (SELECT auth.jwt() ->> 'email')
    AND accepted_at IS NULL
    AND expires_at > now()
  );

-- Campaigns
CREATE POLICY "org_members_can_view_campaigns" ON entrevista.campaigns
  FOR SELECT USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_insert_campaigns" ON entrevista.campaigns
  FOR INSERT WITH CHECK (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_update_campaigns" ON entrevista.campaigns
  FOR UPDATE USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_delete_campaigns" ON entrevista.campaigns
  FOR DELETE USING (org_id = entrevista.get_org_id());

-- Research briefs
CREATE POLICY "org_members_can_view_briefs" ON entrevista.research_briefs
  FOR SELECT USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_insert_briefs" ON entrevista.research_briefs
  FOR INSERT WITH CHECK (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_update_briefs" ON entrevista.research_briefs
  FOR UPDATE USING (org_id = entrevista.get_org_id());

-- Respondents
CREATE POLICY "org_members_can_view_respondents" ON entrevista.respondents
  FOR SELECT USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_insert_respondents" ON entrevista.respondents
  FOR INSERT WITH CHECK (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_update_respondents" ON entrevista.respondents
  FOR UPDATE USING (org_id = entrevista.get_org_id());

CREATE POLICY "org_members_can_delete_respondents" ON entrevista.respondents
  FOR DELETE USING (org_id = entrevista.get_org_id());

-- ============================================================
-- Drop old public function (keep entrevista version)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_org_id();

-- ============================================================
-- Grant usage to PostgREST roles
-- ============================================================
GRANT USAGE ON SCHEMA entrevista TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA entrevista TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA entrevista TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA entrevista GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA entrevista GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
