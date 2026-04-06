# Roadmap: EntrevistaAI

## Overview

EntrevistaAI transforms a proven voice interview prototype into a multi-tenant SaaS platform. The roadmap builds outward from the foundation: tenant-isolated auth and the dashboard shell first, then the campaign management layer researchers use daily, then the core voice interview engine (productionizing the existing prototype), then the analysis pipeline that turns transcripts into insights, and finally the WhatsApp async channel as an alternative interview delivery mechanism. Each phase delivers a complete, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Multi-tenant auth, Supabase schema with RLS, and dark-first dashboard shell
- [ ] **Phase 2: Campaign & Script Builder** - Campaign lifecycle, interview script builder, and respondent management
- [ ] **Phase 3: Voice Interview** - Live AI voice interviews via WebRTC, productionizing the proven prototype
- [ ] **Phase 4: Analysis & Reports** - Per-interview insights, cross-campaign analysis, and PDF report export
- [ ] **Phase 5: WhatsApp Channel** - Async voice message interviews via WhatsApp using open-source integration

## Phase Details

### Phase 1: Foundation
**Goal**: Researchers can sign up, create organizations, and navigate a polished dashboard shell -- with tenant isolation guaranteeing data privacy from day one
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. User can sign up with email/password, log in, and stay logged in across browser sessions
  2. User can create an organization and invite team members who then share access
  3. User can reset their password via email link
  4. Dashboard renders with dark-first UI, electric violet accent, and navigation between Campaigns/Reports/Settings sections
  5. A user in Org A cannot see any data belonging to Org B (RLS enforced at database level)
**Plans:** 3 plans
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js project, shadcn/ui design system, Supabase clients, multi-tenant schema with RLS, Vitest setup
- [x] 01-02-PLAN.md — Auth flow (signup, login, password reset) and dashboard shell with Linear-style sidebar and navigation
- [x] 01-03-PLAN.md — Landing page, org management (invite members, create org, accept invites), schema push to Supabase

### Phase 2: Campaign & Script Builder
**Goal**: Researchers can create campaigns, build structured interview scripts with branching logic, manage respondents, and generate invite links -- everything needed to set up an interview study
**Depends on**: Phase 1
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, RESP-01, RESP-02, RESP-03, RESP-04, RESP-05
**Success Criteria** (what must be TRUE):
  1. User can create a campaign with name, description, language, duration target, voice persona, and interviewer style
  2. User can build an interview script with ordered questions and branching follow-up rules, then preview it
  3. User can view all campaigns on a dashboard with status indicators and progress counts
  4. User can add respondents, generate unique or reusable invite links, and send reminders
  5. Respondent sees a consent screen when opening an invite link before any interview begins
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Voice Interview
**Goal**: Respondents can click an invite link and have a natural, adaptive voice conversation with an AI interviewer -- with real-time transcription, time management, and full recording
**Depends on**: Phase 2
**Requirements**: WEBR-01, WEBR-02, WEBR-03, WEBR-04, WEBR-05, WEBR-06, WEBR-07, WEBR-08, DASH-05
**Success Criteria** (what must be TRUE):
  1. Respondent clicks invite link, accepts consent, and begins talking to the AI interviewer in their browser
  2. AI asks questions from the campaign script using the selected voice persona and generates adaptive follow-ups
  3. AI gracefully handles off-topic responses, silence, and respondent confusion without breaking the conversation
  4. Real-time transcript with speaker labels displays during the interview, and respondent can fall back to text input
  5. Interview audio is recorded and stored, and the session respects the campaign duration target
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Analysis & Reports
**Goal**: Every completed interview automatically produces structured insights, campaigns get cross-interview thematic analysis, and researchers can export professional PDF reports
**Depends on**: Phase 3
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05, ANAL-06, ANAL-07, ANAL-08
**Success Criteria** (what must be TRUE):
  1. After an interview completes, a per-interview report auto-generates with themes, sentiment, key quotes, and executive summary
  2. User can view the full interview transcript with speaker labels and timestamps
  3. Cross-campaign analysis extracts patterns, theme frequency, sentiment trends, and representative quotes with source attribution across all interviews in a campaign
  4. User can export per-interview and per-campaign reports to PDF
  5. User can define custom report templates that run alongside the auto-generated generic analysis
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: WhatsApp Channel
**Goal**: Respondents can complete interviews asynchronously via WhatsApp voice messages, giving researchers a second channel that meets respondents where they already are
**Depends on**: Phase 3
**Requirements**: WHAP-01, WHAP-02, WHAP-03, WHAP-04, WHAP-05, WHAP-06, WHAP-07
**Success Criteria** (what must be TRUE):
  1. Respondent receives a WhatsApp message inviting them to an interview and can reply with voice messages at their own pace
  2. Bot sends interview questions as voice messages and selects adaptive follow-ups based on transcribed responses
  3. Interview state persists between async message exchanges -- respondent can pick up where they left off
  4. Bot sends a thank-you message and marks the interview complete when all questions are answered
  5. Integration uses an open-source WhatsApp solution (WAHA/Kapso/similar) with a documented migration path to the official Meta API
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Campaign & Script Builder | 0/3 | Not started | - |
| 3. Voice Interview | 0/3 | Not started | - |
| 4. Analysis & Reports | 0/3 | Not started | - |
| 5. WhatsApp Channel | 0/3 | Not started | - |
