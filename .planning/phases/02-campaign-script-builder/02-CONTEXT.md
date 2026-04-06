# Phase 2: Campaign & Script Builder - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Campaign lifecycle (create, edit, archive), research brief builder (AI-driven interview guidance — NOT deterministic question lists), respondent management with invite links, and the consent screen respondents see before interviews. This phase fills the dashboard shell from Phase 1 with real campaign management functionality.

</domain>

<decisions>
## Implementation Decisions

### Campaign Creation UX
- **D-01:** Campaign creation flow: Claude's discretion — pick the best UX approach (wizard, single form, or progressive disclosure).
- **D-02:** Campaign list view: Claude's discretion — pick based on information density needs (cards, table, or hybrid).
- **D-03:** Campaign status model: Claude's discretion — pick the right states (minimum: Draft → Active → Completed, optionally add Paused).

### Research Brief (Script) — CRITICAL DECISION
- **D-04:** The "script" is NOT a deterministic list of questions. It is a **research brief** that guides the AI interviewer with goals, context, and data requirements. The AI determines actual questions dynamically based on conversation flow.
- **D-05:** Research brief must include 4 sections: (1) Research goals — what the researcher wants to learn, (2) Critical data points — specific information the AI must gather, (3) Context/background — what the AI needs to know about the subject, (4) Tone/approach notes — how the AI should handle the conversation.
- **D-06:** Brief format: Claude's discretion — structured form fields vs freeform vs hybrid. Must accommodate all 4 sections from D-05.
- **D-07:** Script preview: Claude's discretion — read-only walkthrough or simulated interaction.
- **D-08:** The CONF-01 and CONF-02 requirements (script builder, branching logic) should be reinterpreted: instead of explicit branching, the brief defines goals and the AI handles the conversational flow. "Branching" becomes "critical paths the AI should explore based on responses."

### Respondent Management
- **D-09:** Invite link strategy: Claude's discretion — unique per respondent, reusable campaign link, or both.
- **D-10:** Consent screen design: Claude's discretion — simple checkbox or detailed multi-item consent. Consider UX research + HR use cases.
- **D-11:** Respondent list in campaign detail: shows name/email, status (invited/in-progress/completed/dropped), interview date, action buttons.

### Voice & Style Configuration
- **D-12:** Voice persona selection UI: Claude's discretion — voice library grid with play buttons, or simple dropdown with preview.
- **D-13:** Interviewer style selection UI: Claude's discretion — style cards with descriptions/samples, or radio group. 4 styles: Professional, Casual, Empathetic, Direct.
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, target users (UX agencies, founders, HR)
- `.planning/REQUIREMENTS.md` — CAMP-01..05, CONF-01..06, RESP-01..05 with acceptance criteria
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, requirement mapping

### Phase 1 Decisions (carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Dashboard layout (D-01..D-03), visual identity (D-04..D-08), density rules
- `.planning/phases/01-foundation/01-UI-SPEC.md` — UI design contract: colors, typography, spacing, component library

### Research
- `.planning/research/FEATURES.md` — Feature landscape, competitor analysis, table stakes vs differentiators
- `.planning/research/ARCHITECTURE.md` — Multi-tenant data model, script engine design
- `.planning/research/PITFALLS.md` — Common mistakes in interview platforms

### Prototype Reference
- `C:\Users\Waniboko\consultoria_ale\agent\interview_config.py` — Existing system prompt + question bank pattern (reference for how the AI-driven brief becomes a system prompt)
- `C:\Users\Waniboko\consultoria_ale\agent\interview_state.py` — State machine pattern (reference for interview phases)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(dashboard)/layout.tsx` — Dashboard layout with sidebar, org context loading
- `src/app/(dashboard)/campaigns/page.tsx` — Empty campaigns page (replace with real content)
- `src/components/app-sidebar.tsx` — Sidebar with navigation (Campaigns nav item already active)
- `src/components/ui/` — Full shadcn/ui component library (Button, Input, Dialog, Table, Card, etc.)
- `src/lib/supabase/server.ts` — Server-side Supabase client for data fetching
- `src/lib/validations/auth.ts` — Zod validation pattern (reuse for campaign/brief schemas)
- `supabase/migrations/001_foundation.sql` — Existing schema with organizations, org_members, org_invites

### Established Patterns
- Server Actions pattern for mutations (used in auth + settings)
- RLS with `get_org_id()` for tenant isolation — all new tables need `org_id` column
- Form pattern: react-hook-form + zodResolver + server action
- Dialog pattern for create/edit modals (see create-org-dialog.tsx, invite-member-dialog.tsx)

### Integration Points
- New Supabase migration needed for: campaigns, interview_scripts (research briefs), respondents, interview_links tables
- Campaigns page replaces the current empty state
- Campaign detail page is a new route: `/campaigns/[id]`
- Consent screen is a new public route: `/interview/[token]` (just the consent part for now; actual interview is Phase 3)

</code_context>

<specifics>
## Specific Ideas

- The research brief concept is inspired by how the consultoria_ale prototype works: a system prompt with goals, phases, and question banks guides the AI — but here it's configurable per campaign instead of hardcoded.
- "The questions themselves should be determined by the AI dynamically based on the conversation flow, having a clear goal" — this means CONF-01 (script builder) becomes a research brief builder, and CONF-02 (branching logic) becomes defining critical conversation paths the AI should explore.
- The 4 brief sections (goals, data points, context, tone) map directly to how the prototype's `interview_config.py` structures its system prompt.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-campaign-script-builder*
*Context gathered: 2026-04-05*
