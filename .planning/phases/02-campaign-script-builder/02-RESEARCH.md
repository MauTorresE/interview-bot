# Phase 2: Campaign & Script Builder - Research

**Researched:** 2026-04-06
**Domain:** Multi-tenant CRUD, form-heavy UI, Supabase schema design, invite token systems
**Confidence:** HIGH

## Summary

Phase 2 transforms the empty campaigns page from Phase 1 into a full campaign management system. The technical domain is well-understood: multi-tenant CRUD with Supabase RLS, form handling with react-hook-form + zod, and a tab-based detail page. The most novel element is the "research brief" concept (D-04/D-05) which replaces a traditional deterministic script builder with a 4-section freeform+structured editor that guides the AI interviewer.

The existing Phase 1 codebase provides strong patterns to follow: server actions for mutations, `get_org_id()` for RLS isolation, zod schemas for validation, and shadcn/ui components. The new migration must add 3 tables (campaigns, research_briefs, respondents) with proper RLS policies and foreign keys to the existing organizations table. The consent screen is a new public route outside the dashboard layout.

**Primary recommendation:** Follow Phase 1 patterns exactly. Use server actions for all mutations, add a new Supabase migration for the schema, and build the research brief as a JSONB column with structured sections. The invite token system uses UUID tokens with a public `/interview/[token]` route for the consent screen.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-04:** The "script" is NOT a deterministic list of questions. It is a research brief that guides the AI interviewer with goals, context, and data requirements. The AI determines actual questions dynamically.
- **D-05:** Research brief must include 4 sections: (1) Research goals, (2) Critical data points, (3) Context/background, (4) Tone/approach notes.
- **D-08:** CONF-01/CONF-02 reinterpreted: instead of explicit branching, the brief defines goals and the AI handles conversational flow. "Branching" becomes "critical paths the AI should explore based on responses."
- **D-11:** Respondent list shows name/email, status (invited/in-progress/completed/dropped), interview date, action buttons.
- **D-14:** Voice and style config live on the campaign detail/settings page, not during initial creation. Campaign creation is minimal; configuration is progressive.

### Claude's Discretion
- Campaign creation flow pattern (wizard vs single form vs progressive disclosure)
- Campaign list layout (cards vs table vs hybrid)
- Campaign status model (3-state vs 4-state)
- Research brief form format (structured fields vs freeform vs hybrid)
- Script preview UX
- Invite link strategy (unique vs reusable vs both)
- Consent screen detail level
- Voice selection UI (grid vs dropdown)
- Style selection UI (cards vs radio)
- Empty states for campaign detail sub-sections
- Loading skeletons and error states
- Campaign detail page tab/section layout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAMP-01 | Create campaign with name, description, language, duration target | Campaign creation dialog + campaigns table schema + createCampaign server action |
| CAMP-02 | Edit campaign details and archive completed campaigns | Campaign config tab + updateCampaign/archiveCampaign server actions + status model |
| CAMP-03 | View campaign dashboard with status indicators | Campaign list page with card grid + status badges + filtering |
| CAMP-04 | Campaign dashboard shows progress per campaign | Progress bar component + computed count from respondents table |
| CAMP-05 | Assign interview script to campaign | Research brief is stored per campaign (1:1 relationship via research_briefs table) |
| CONF-01 | Create interview scripts with ordered questions and follow-up rules | Reinterpreted per D-04/D-08: research brief builder with 4 structured sections |
| CONF-02 | Script builder supports branching logic | Reinterpreted per D-08: "critical paths" UI where user defines conditional exploration goals |
| CONF-03 | Select voice persona per campaign from library | Voice persona list in config tab with play preview buttons |
| CONF-04 | Select interviewer style per campaign | Toggle group (4 styles) in config tab with descriptions |
| CONF-05 | Set interview duration target per campaign | Duration select in campaign creation dialog + editable in config tab |
| CONF-06 | Preview interview script before launching | Read-only dialog rendering brief as formatted system prompt summary |
| RESP-01 | Generate unique invite links per respondent or reusable campaign link | UUID tokens per respondent + campaign-level reusable link toggle |
| RESP-02 | View respondent list with status indicators | Respondent table in Participantes tab with status badges |
| RESP-03 | Add respondent details before sending invite | Add respondent dialog with name, email, notes fields |
| RESP-04 | Send reminders to respondents who haven't completed | Server action for email reminder (email sending infrastructure needed) |
| RESP-05 | Respondent sees consent screen before starting interview | Public `/interview/[token]` route with multi-item consent checkboxes |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.2 | App Router, server actions, server components | Already installed, patterns established in Phase 1 [VERIFIED: package.json] |
| @supabase/supabase-js | 2.101.1 | Supabase client for DB operations | Already installed [VERIFIED: package.json] |
| @supabase/ssr | 0.10.0 | Server-side Supabase client creation | Already installed, used in server.ts [VERIFIED: package.json] |
| react-hook-form | 7.72.1 | Form state management | Already installed, pattern in auth forms [VERIFIED: package.json] |
| @hookform/resolvers | 5.2.2 | Zod integration for react-hook-form | Already installed [VERIFIED: package.json] |
| zod | 4.3.6 | Schema validation | Already installed, used for auth schemas [VERIFIED: package.json] |
| lucide-react | 1.7.0 | Icons | Already installed [VERIFIED: package.json] |
| sonner | 2.0.7 | Toast notifications | Already installed [VERIFIED: package.json] |

### New shadcn Components (No npm install needed)
| Component | Usage | Source |
|-----------|-------|--------|
| Table | Respondent list | `npx shadcn@latest add table` [VERIFIED: UI-SPEC component inventory] |
| Tabs | Campaign detail sections | `npx shadcn@latest add tabs` |
| Textarea | Research brief sections | `npx shadcn@latest add textarea` |
| Badge | Status indicators | `npx shadcn@latest add badge` |
| Select | Language, duration, voice dropdowns | `npx shadcn@latest add select` |
| Switch | Reusable link toggle | `npx shadcn@latest add switch` |
| Checkbox | Consent screen | `npx shadcn@latest add checkbox` |
| Progress | Campaign completion bar | `npx shadcn@latest add progress` |
| Alert Dialog | Destructive confirmations | `npx shadcn@latest add alert-dialog` |
| Breadcrumb | Campaign detail navigation | `npx shadcn@latest add breadcrumb` |
| Collapsible | Research brief sections | `npx shadcn@latest add collapsible` |
| Toggle Group | Interviewer style selection | `npx shadcn@latest add toggle-group` |
| Popover | Filter controls, date display | `npx shadcn@latest add popover` |
| Command | Voice persona search/select | `npx shadcn@latest add command` |

### Supporting (No New Installs)
All needed libraries are already in package.json. No new npm dependencies required for Phase 2.

**Installation:**
```bash
# shadcn components only (no npm install needed)
npx shadcn@latest add table tabs textarea badge select switch checkbox progress alert-dialog breadcrumb collapsible toggle-group popover command
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (dashboard)/
      campaigns/
        page.tsx                    # Campaign list (replace existing empty state)
        [id]/
          page.tsx                  # Campaign detail with tabs
          actions.ts                # Server actions: updateCampaign, archiveCampaign
      campaigns/actions.ts          # Server action: createCampaign
    interview/
      [token]/
        page.tsx                    # Public consent screen
        actions.ts                  # Server action: validateToken, recordConsent
  components/
    campaigns/
      campaign-card.tsx             # Campaign card for list grid
      campaign-grid.tsx             # Grid layout with filtering
      create-campaign-dialog.tsx    # Creation dialog
      campaign-tabs.tsx             # Tab navigation for detail page
      summary-tab.tsx               # Resumen tab content
      brief-tab.tsx                 # Guia de investigacion tab content
      respondents-tab.tsx           # Participantes tab content
      config-tab.tsx                # Configuracion tab content
      brief-preview-dialog.tsx      # Read-only brief preview
      add-respondent-dialog.tsx     # Add respondent form
      voice-persona-list.tsx        # Voice selection with play buttons
      style-toggle.tsx              # Interviewer style toggle group
      status-badge.tsx              # Reusable campaign/respondent status badge
  lib/
    validations/
      campaign.ts                   # Zod schemas for campaign, brief, respondent
    constants/
      campaign.ts                   # Status enums, style descriptions, voice options
supabase/
  migrations/
    002_campaigns.sql               # New tables: campaigns, research_briefs, respondents
```

### Pattern 1: Server Actions for Mutations (Established in Phase 1)
**What:** All data mutations go through Next.js server actions with zod validation, admin client for writes, and `revalidatePath` for cache busting.
**When to use:** Every create/update/delete operation.
**Example:**
```typescript
// Source: Existing pattern from src/app/(dashboard)/settings/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createCampaignSchema } from '@/lib/validations/campaign'
import { revalidatePath } from 'next/cache'

type ActionResult = {
  success?: boolean
  error?: string
  data?: { id: string }
}

export async function createCampaign(input: {
  name: string
  description?: string
  language: string
  duration_target_minutes: number
}): Promise<ActionResult> {
  const parsed = createCampaignSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos de campana invalidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const orgId = user.app_metadata?.org_id
  if (!orgId) return { error: 'Sin organizacion activa.' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      language: parsed.data.language,
      duration_target_minutes: parsed.data.duration_target_minutes,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !campaign) {
    return { error: 'No se pudo crear la campana. Intenta de nuevo.' }
  }

  revalidatePath('/campaigns')
  return { success: true, data: { id: campaign.id } }
}
```

### Pattern 2: Server Component Data Fetching with RLS
**What:** Dashboard pages are server components that fetch data through the authenticated Supabase client (which respects RLS).
**When to use:** All data loading for dashboard pages.
**Example:**
```typescript
// Source: Pattern from src/app/(dashboard)/layout.tsx
import { createClient } from '@/lib/supabase/server'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, status, language, duration_target_minutes, created_at')
    .order('created_at', { ascending: false })

  // RLS automatically filters by org_id from JWT
  return <CampaignGrid campaigns={campaigns ?? []} />
}
```

### Pattern 3: Research Brief as JSONB
**What:** The research brief is stored as a JSONB column in a `research_briefs` table, with the 4 sections as structured fields plus an array of critical paths.
**When to use:** Brief storage and retrieval.
**Example:**
```typescript
// Brief data shape (stored as JSONB)
interface ResearchBrief {
  research_goals: string       // Section 1: Freeform text
  critical_data_points: string // Section 2: Freeform text
  critical_paths: Array<{      // Section 2 sub-section: conditional explorations
    trigger: string            // "Si el participante menciona..."
    exploration: string        // "entonces explorar..."
  }>
  context_background: string   // Section 3: Freeform text
  tone_approach: string        // Section 4: Freeform text
}
```

### Pattern 4: Invite Token System
**What:** Each respondent gets a UUID invite token. A separate campaign-level reusable token exists. The public `/interview/[token]` route validates the token and shows the consent screen.
**When to use:** Respondent access and consent flow.
**Example:**
```typescript
// Token validation in public consent page (server component)
export default async function ConsentPage({ params }: { params: { token: string } }) {
  // Use admin client since this is a public page (no auth)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: respondent } = await admin
    .from('respondents')
    .select('id, name, status, campaigns(id, name, status)')
    .eq('invite_token', params.token)
    .single()

  if (!respondent) {
    return <InvalidTokenScreen />
  }
  // ... render consent form
}
```

### Anti-Patterns to Avoid
- **Client-side data fetching for initial page loads:** Use server components. Client fetching only for real-time updates or user-triggered refreshes. [VERIFIED: Phase 1 pattern]
- **Direct Supabase client mutations:** Always go through server actions with admin client for writes. The anon client is read-only via RLS. [VERIFIED: settings/actions.ts pattern]
- **Storing brief sections as separate columns:** Use JSONB for the brief content to keep the schema flexible and avoid migration churn as brief structure evolves. [ASSUMED]
- **Building custom status badge components from scratch:** Use shadcn Badge with variant props and tailwind for status colors. [VERIFIED: UI-SPEC defines exact colors]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state + validation | Custom useState per field | react-hook-form + zod + zodResolver | Already established pattern; handles dirty tracking, error display, submission state [VERIFIED: existing auth forms] |
| Toast notifications | Custom notification system | sonner (already installed) | Phase 1 already uses it [VERIFIED: package.json] |
| Tab navigation | Custom tab state | shadcn Tabs component | Handles keyboard nav, ARIA roles, content panels [VERIFIED: UI-SPEC component inventory] |
| Status badges with colors | Custom colored spans | shadcn Badge with custom className | Consistent with design system [VERIFIED: UI-SPEC] |
| Confirmation dialogs | Custom modal with state | shadcn AlertDialog | Handles focus trap, escape key, overlay [VERIFIED: UI-SPEC] |
| UUID token generation | Custom random string | `gen_random_uuid()` in Postgres | Cryptographically secure, no application code needed [VERIFIED: existing invite token pattern in 001_foundation.sql] |
| Clipboard copy | Custom clipboard API wrapper | `navigator.clipboard.writeText()` with sonner toast | Simple API, no library needed [ASSUMED] |

**Key insight:** Phase 2 is entirely built from existing patterns and shadcn components. There is no novel technical challenge -- the complexity is in the number of interconnected views and forms, not in any individual component.

## Common Pitfalls

### Pitfall 1: Missing RLS Policies on New Tables
**What goes wrong:** New tables (campaigns, research_briefs, respondents) are created without RLS policies, leaking data across tenants.
**Why it happens:** Easy to forget `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and individual policies for SELECT/INSERT/UPDATE/DELETE.
**How to avoid:** Every new table must have: (1) `ENABLE ROW LEVEL SECURITY`, (2) SELECT policy using `org_id = get_org_id()`, (3) INSERT policy with `WITH CHECK (org_id = get_org_id())`, (4) UPDATE/DELETE policies as needed. Follow the exact pattern from `001_foundation.sql`.
**Warning signs:** Data from other orgs appearing in queries; empty results when data should exist.

### Pitfall 2: Consent Screen Needs Admin Client (No Auth)
**What goes wrong:** The `/interview/[token]` consent page tries to use the authenticated Supabase client, but respondents are not authenticated users.
**Why it happens:** All other pages use `createClient()` (anon key + cookies) which requires a logged-in session.
**How to avoid:** The consent page must use the service role admin client for token lookup, or create a dedicated Supabase function/RPC that accepts a token without auth. The admin client approach is simpler and matches the existing `settings/actions.ts` pattern.
**Warning signs:** 401 errors on consent page; empty data when looking up valid tokens.

### Pitfall 3: Campaign Progress Count Requires Join or Denormalization
**What goes wrong:** Campaign list page becomes slow because each campaign card needs a count of completed/total respondents, requiring N+1 queries.
**Why it happens:** The campaigns table doesn't store respondent counts; you need to join or aggregate from the respondents table.
**How to avoid:** Either (a) use a single Supabase query with `.select('*, respondents(count)')` which Supabase supports for aggregate counts, or (b) add denormalized `respondent_count` and `completed_count` columns updated via triggers. Option (a) is simpler for Phase 2 scale. [ASSUMED]
**Warning signs:** Campaign list page loading slowly; visible N+1 query pattern in network tab.

### Pitfall 4: Reusable Campaign Link vs Per-Respondent Link Confusion
**What goes wrong:** The reusable campaign link and per-respondent unique links share the same `/interview/[token]` route but have different data models and behaviors.
**Why it happens:** Reusable links don't have a pre-created respondent record; they need to create one on consent.
**How to avoid:** Store the reusable link token on the campaigns table itself (e.g., `reusable_invite_token` column). When this token is used, the consent page creates a new respondent record on submission. Per-respondent tokens reference existing respondent records.
**Warning signs:** Duplicate respondent entries; inability to distinguish link sources.

### Pitfall 5: Brief Auto-Save vs Explicit Save UX
**What goes wrong:** Users lose work because the brief editor doesn't save automatically, or conversely, saves trigger too frequently and create noise.
**Why it happens:** The UI-SPEC specifies an explicit "Guardar" button with an unsaved-changes indicator, but long text editing sessions risk data loss.
**How to avoid:** Implement explicit save (per UI-SPEC) but add a browser `beforeunload` warning when there are unsaved changes. Do NOT implement auto-save -- the UI-SPEC explicitly shows a manual save button with a dirty indicator.
**Warning signs:** Users reporting lost work; no unsaved-changes warning on navigation.

### Pitfall 6: Email Sending for Reminders (RESP-04)
**What goes wrong:** The reminder feature requires actually sending emails, which needs an email service not yet set up.
**Why it happens:** RESP-04 says "send reminders" but no email infrastructure exists in the stack.
**How to avoid:** For Phase 2, implement the reminder server action and UI but stub the actual email sending. Use `console.log` or a toast indicating the reminder was "queued." Add a TODO for email integration (Supabase Edge Functions + Resend or similar) as a follow-up task. The important thing is the UX flow exists.
**Warning signs:** Feature appears complete but no emails actually arrive.

## Code Examples

### Zod Schema for Campaign Creation
```typescript
// Source: Pattern from src/lib/validations/auth.ts, adapted for campaigns
import { z } from 'zod'

export const createCampaignSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener mas de 100 caracteres'),
  description: z.string().max(500).optional(),
  language: z.enum(['es-419', 'es-ES']).default('es-419'),
  duration_target_minutes: z.enum(['10', '15', '30']).transform(Number).default('15'),
})

export const researchBriefSchema = z.object({
  research_goals: z.string().max(5000),
  critical_data_points: z.string().max(5000),
  critical_paths: z.array(z.object({
    trigger: z.string().min(1).max(500),
    exploration: z.string().min(1).max(500),
  })).max(10).default([]),
  context_background: z.string().max(5000),
  tone_approach: z.string().max(3000),
})

export const addRespondentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email invalido'),
  notes: z.string().max(500).optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type ResearchBriefInput = z.infer<typeof researchBriefSchema>
export type AddRespondentInput = z.infer<typeof addRespondentSchema>
```

### Supabase Migration (002_campaigns.sql)
```sql
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
```

### Campaign Status Constants
```typescript
// src/lib/constants/campaign.ts
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number]

export const RESPONDENT_STATUSES = ['invited', 'in_progress', 'completed', 'dropped'] as const
export type RespondentStatus = typeof RESPONDENT_STATUSES[number]

export const INTERVIEWER_STYLES = [
  { value: 'professional', label: 'Profesional', description: 'Tono formal y estructurado. Ideal para investigacion corporativa.' },
  { value: 'casual', label: 'Casual', description: 'Tono conversacional y relajado. Ideal para estudios de consumidor.' },
  { value: 'empathetic', label: 'Empatico', description: 'Tono calido y comprensivo. Ideal para temas sensibles.' },
  { value: 'direct', label: 'Directo', description: 'Tono conciso y enfocado. Ideal para entrevistas cortas.' },
] as const

export const VOICE_PERSONAS = [
  { id: 'voxtral-natalia', name: 'Natalia', provider: 'voxtral', premium: false },
  { id: 'voxtral-diego', name: 'Diego', provider: 'voxtral', premium: false },
  { id: 'elevenlabs-sofia', name: 'Sofia', provider: 'elevenlabs', premium: true },
  { id: 'elevenlabs-marco', name: 'Marco', provider: 'elevenlabs', premium: true },
] as const
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deterministic question trees with branching | AI-driven research brief with goals and critical paths | Phase 2 design decision (D-04) | Simpler UI, more flexible interviews, matches prototype pattern |
| Separate scripts table shared across campaigns | 1:1 research brief per campaign | Phase 2 design decision | Simpler data model, no script versioning needed in Phase 2 |
| `next/router` client-side navigation | `next/navigation` + server components | Next.js 13+ (App Router) | All navigation uses server components and `redirect()` [VERIFIED: existing code] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JSONB for brief_data is better than separate columns for each section | Architecture Patterns | LOW -- easy to migrate; JSONB gives schema flexibility |
| A2 | Supabase `.select('*, respondents(count)')` works for aggregate counts in campaign list | Common Pitfalls | MEDIUM -- if not supported, need a Postgres view or separate query |
| A3 | navigator.clipboard.writeText() is sufficient for copy-to-clipboard | Don't Hand-Roll | LOW -- widely supported in modern browsers |
| A4 | Voice persona list is hardcoded for Phase 2 (not database-driven) | Code Examples | LOW -- 4 voices is fine hardcoded; database-driven is Phase 3+ concern |
| A5 | Email sending for RESP-04 will be stubbed (no actual email service) | Common Pitfalls | MEDIUM -- user may expect real reminders; needs explicit communication |
| A6 | The admin client pattern (service role key) is appropriate for public consent page token lookups | Architecture Patterns | LOW -- this is the established pattern for unauthenticated operations |

## Open Questions (RESOLVED)

1. **Email infrastructure for reminders (RESP-04)** — RESOLVED
   - What we know: No email service is configured. The stack mentions Supabase Edge Functions for background tasks.
   - What's unclear: Whether to stub reminders entirely or set up a basic email provider now.
   - Recommendation: Stub the action, log the intent, show toast. Email integration is a cross-cutting concern better addressed as a dedicated task or in a later phase. **Resolution:** Implemented as stubbed server action in Plan 03 (sendReminder logs intent, returns success). Email service deferred to future phase.

2. **Voice persona audio samples** — RESOLVED
   - What we know: UI-SPEC specifies play buttons for voice preview. Voice personas are Voxtral and ElevenLabs.
   - What's unclear: Where to host sample audio clips for the voice preview in the config tab.
   - Recommendation: Use static audio files in `/public/voices/` for Phase 2. These can be short 3-5 second clips. Alternatively, stub with a placeholder and add real samples when the voice pipeline is integrated in Phase 3. **Resolution:** Play button stubbed with toast "Vista previa de voz no disponible aun" in Plan 04. Real audio samples deferred to Phase 3 voice pipeline integration.

3. **Supabase type generation** — RESOLVED
   - What we know: No Supabase type generation is set up. Supabase CLI is available via `npx supabase` (v2.84.10).
   - What's unclear: Whether to set up `supabase gen types` now or continue without it.
   - Recommendation: Set up type generation as a Wave 0 task. Having typed database responses prevents bugs in the many CRUD operations this phase creates. **Resolution:** Deferred — inline types used for Phase 2 CRUD operations. Type generation can be set up as a standalone task when schema stabilizes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | Yes | (verified via next) | -- |
| Supabase CLI | Migration management, type gen | Yes (npx) | 2.84.10 | -- |
| Supabase Cloud | Database, Auth, RLS | Yes | (existing project) | -- |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- Email service (for RESP-04 reminders) -- fallback: stub with console.log/toast

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (exists, jsdom environment, path aliases configured) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMP-01 | Campaign creation validation | unit | `npx vitest run tests/validations/campaign.test.ts -t "create"` | No -- Wave 0 |
| CAMP-02 | Campaign edit + archive actions | unit | `npx vitest run tests/actions/campaign.test.ts -t "update"` | No -- Wave 0 |
| CAMP-03 | Campaign list renders with status badges | unit | `npx vitest run tests/components/campaign-grid.test.tsx` | No -- Wave 0 |
| CONF-01/02 | Research brief schema validation | unit | `npx vitest run tests/validations/campaign.test.ts -t "brief"` | No -- Wave 0 |
| CONF-06 | Brief preview renders all sections | unit | `npx vitest run tests/components/brief-preview.test.tsx` | No -- Wave 0 |
| RESP-01 | Invite token generation (DB default) | manual-only | Verify via Supabase SQL | -- |
| RESP-03 | Respondent add validation | unit | `npx vitest run tests/validations/campaign.test.ts -t "respondent"` | No -- Wave 0 |
| RESP-05 | Consent screen renders with checkboxes, disables button | unit | `npx vitest run tests/components/consent-screen.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/validations/campaign.test.ts` -- covers CAMP-01, CONF-01/02, RESP-03 validation schemas
- [ ] `tests/components/campaign-grid.test.tsx` -- covers CAMP-03 rendering
- [ ] `tests/components/brief-preview.test.tsx` -- covers CONF-06 preview rendering
- [ ] `tests/components/consent-screen.test.tsx` -- covers RESP-05 consent flow

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (respondents are unauthenticated; dashboard uses existing Supabase Auth) | Supabase Auth (existing) |
| V3 Session Management | No (existing from Phase 1) | Supabase SSR cookies (existing) |
| V4 Access Control | Yes | RLS policies with `get_org_id()` on all new tables |
| V5 Input Validation | Yes | Zod schemas on all server actions; SQL parameterized via Supabase client |
| V6 Cryptography | No (UUID tokens are cryptographically random via Postgres) | `gen_random_uuid()` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tenant data leakage | Information Disclosure | RLS policies on every table with `org_id = get_org_id()` |
| Invite token enumeration | Information Disclosure | UUIDs are 128-bit random; infeasible to brute-force |
| IDOR on campaign/respondent IDs | Tampering | RLS prevents access to resources outside org; server actions validate org membership |
| XSS in research brief content | Tampering | React auto-escapes JSX output; brief content rendered as text, not HTML |
| CSRF on server actions | Tampering | Next.js server actions use POST with Origin/Referer checking by default |

## Sources

### Primary (HIGH confidence)
- `package.json` -- verified all library versions currently installed
- `001_foundation.sql` -- RLS pattern, `get_org_id()` function, table structure conventions
- `src/app/(dashboard)/settings/actions.ts` -- Server action pattern with admin client
- `src/lib/validations/auth.ts` -- Zod schema pattern with Spanish error messages
- `02-UI-SPEC.md` -- Component inventory, layout contracts, copywriting, interaction patterns
- `02-CONTEXT.md` -- All locked decisions (D-01 through D-14)
- `.planning/research/ARCHITECTURE.md` -- Schema design, Script Engine architecture, RLS strategy

### Secondary (MEDIUM confidence)
- `consultoria_ale/agent/interview_config.py` -- Prototype system prompt pattern (reference for how brief becomes system prompt)

### Tertiary (LOW confidence)
- Supabase aggregate count via `.select('*, respondents(count)')` -- needs verification against current Supabase JS client docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and patterns established in Phase 1
- Architecture: HIGH -- follows existing codebase patterns exactly; schema based on ARCHITECTURE.md research
- Pitfalls: HIGH -- derived from actual codebase analysis (auth patterns, RLS patterns, public vs authenticated routes)

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable domain, no fast-moving dependencies)
