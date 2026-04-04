# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-tenant auth with Supabase (signup, login, password reset, org creation, team invites), row-level security ensuring tenant isolation, and a dark-first dashboard shell with navigation structure. This phase delivers the skeleton that all future phases build within.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** Left sidebar navigation, collapsible — logo at top, nav items below, org switcher at bottom. Linear-style.
- **D-02:** Adaptive content width — full width for tables/dashboards, max-width centered for forms/settings.
- **D-03:** Primary navigation items: Campaigns, Reports, Settings. No home/overview page for v1.

### Visual Identity
- **D-04:** Font: Geist Sans + Geist Mono (already used in prototype). Clean, modern, interface-native.
- **D-05:** Component library: shadcn/ui with Tailwind CSS (already proven in prototype). Copy-paste components, full control.
- **D-06:** Accent color: Blue-violet (#6366F1, Tailwind indigo-500). Professional, high-contrast on dark backgrounds. Linear-like energy.
- **D-07:** Dark-first theme as default. Light mode available but not primary focus for v1.
- **D-08:** Information density: Context-adaptive. Claude balances spacious vs compact per view — but must be intentional about layout decisions for each page, not arbitrary. Tables can be denser; forms should breathe.

### Org Model
- **D-09:** Full org + invite system in Phase 1. Create org, invite by email, members share access to all campaigns within their org.
- **D-10:** Org creation timing: Claude's discretion — decide based on what produces the best onboarding UX (during signup flow or auto-create).
- **D-11:** Invite mechanism: Claude's discretion — pick the simplest reliable approach (email invite link or invite code).

### Auth UX Flow
- **D-12:** Auth page design: Claude's discretion — pick best approach matching the dark-first visual identity.
- **D-13:** Auth method: Claude's discretion — password-only or password + magic links, balance simplicity vs modern UX.
- **D-14:** Post-signup: Skip directly to dashboard. Email verification happens in background, not blocking.

### Claude's Discretion
- Auth page layout style (split screen, centered card, or full page)
- Auth method (password-only vs password + magic links)
- Org creation timing (during onboarding vs auto-create)
- Invite mechanism (email link vs code)
- Loading skeletons, error states, empty states for dashboard shell
- Exact spacing, border radii, shadow values within the design system
- Sidebar collapsed/expanded default state

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions (dual TTS, same Supabase project, dark-first UI)
- `.planning/REQUIREMENTS.md` — AUTH-01..06 and DASH-01..04 requirements with acceptance criteria
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirement mapping

### Research
- `.planning/research/STACK.md` — Recommended stack with versions, Supabase Auth patterns
- `.planning/research/ARCHITECTURE.md` — Multi-tenant data model, RLS patterns, denormalized org_id approach
- `.planning/research/PITFALLS.md` — Silent RLS failures, automated isolation testing requirements

### Prototype Reference
- `C:\Users\Waniboko\consultoria_ale\web\src\app\layout.tsx` — Geist font setup, Tailwind config patterns
- `C:\Users\Waniboko\consultoria_ale\web\src\app\admin\page.tsx` — Admin dashboard layout patterns (reference only)
- `C:\Users\Waniboko\consultoria_ale\supabase\migrations\001_initial_schema.sql` — Existing Supabase schema patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Greenfield repo — no existing code in interview-bot yet
- Prototype at `consultoria_ale/web/` has Next.js 16 + Tailwind v4 + shadcn/ui + Geist fonts — these patterns should be replicated
- Prototype uses `@supabase/ssr` for Next.js Supabase integration — same approach applies

### Established Patterns
- Prototype uses session-token-based auth (no Supabase Auth) — we need to build proper Supabase Auth from scratch
- Prototype has no org/team model — this is entirely new
- Prototype's admin layout (`consultoria_ale/web/src/app/admin/layout.tsx`) shows sidebar pattern but is simpler than what we need

### Integration Points
- Supabase project already exists (shared with consultoria_ale) — new schema in same project
- No other integrations needed for Phase 1

</code_context>

<specifics>
## Specific Ideas

- "I really like these interfaces" — Factory.ai, Linear, Vercel. Common thread: dark-first, generous whitespace, subtle motion, monochrome base + single accent, minimal chrome.
- Linear's sidebar navigation as the primary reference for dashboard layout
- Vercel's adaptive content width approach
- Prototype already uses Geist Sans/Mono — maintain consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04*
