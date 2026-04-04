-- Foundation Migration: Multi-tenant schema with RLS
-- Phase 1, Plan 01 - EntrevistaAI

-- Helper function for RLS policies
-- Extracts org_id from JWT app_metadata (not user-writable, T-01-01/T-01-03)
CREATE OR REPLACE FUNCTION get_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT ((SELECT auth.jwt()) -> 'app_metadata' ->> 'org_id')::UUID
$$;

-- ============================================================
-- Organizations
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Org members (links users to orgs with role-based access)
-- ============================================================
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Org invites (email-based invite tokens, T-01-05)
-- ============================================================
CREATE TABLE org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: organizations
-- ============================================================

-- Members can view their own org
CREATE POLICY "org_members_can_view_own_org" ON organizations
  FOR SELECT USING (id = get_org_id());

-- Authenticated users can create orgs (needed for signup flow)
CREATE POLICY "authenticated_can_insert_org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS Policies: org_members
-- ============================================================

-- Members can view other members in their org
CREATE POLICY "org_members_can_view_members" ON org_members
  FOR SELECT USING (org_id = get_org_id());

-- Owners can manage (update/delete) members in their org
CREATE POLICY "owners_can_manage_members" ON org_members
  FOR ALL USING (
    org_id = get_org_id()
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = get_org_id()
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

-- Users can insert their own membership (needed during signup auto-org-creation)
CREATE POLICY "user_can_insert_own_membership" ON org_members
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- RLS Policies: org_invites
-- ============================================================

-- Org members can view invites for their org
CREATE POLICY "org_members_can_view_invites" ON org_invites
  FOR SELECT USING (org_id = get_org_id());

-- Org members can create invites for their org
CREATE POLICY "org_members_can_create_invites" ON org_invites
  FOR INSERT WITH CHECK (org_id = get_org_id());

-- Invitees can view their own pending invites by email (for accepting)
CREATE POLICY "invitee_can_view_own_invite" ON org_invites
  FOR SELECT USING (
    email = (SELECT auth.jwt() ->> 'email')
    AND accepted_at IS NULL
    AND expires_at > now()
  );
