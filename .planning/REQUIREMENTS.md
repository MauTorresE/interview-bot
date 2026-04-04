# Requirements: EntrevistaAI

**Defined:** 2026-04-04
**Core Value:** Any organization can run professional-quality research interviews at scale — 24/7, at 90% less cost — without sacrificing conversational depth or structured analysis.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password via Supabase Auth
- [x] **AUTH-02**: User can log in and stay logged in across browser sessions
- [x] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User can create an organization and invite team members by email
- [x] **AUTH-05**: Organization members share access to all campaigns within their org
- [x] **AUTH-06**: Row-level security ensures users only see data belonging to their organization

### Campaign Management

- [ ] **CAMP-01**: User can create a campaign with name, description, language, and duration target (10/15/30 min)
- [ ] **CAMP-02**: User can edit campaign details and archive completed campaigns
- [ ] **CAMP-03**: User can view campaign dashboard showing all campaigns with status indicators (pending, active, completed)
- [ ] **CAMP-04**: Campaign dashboard shows progress per campaign (interviews completed / total expected)
- [ ] **CAMP-05**: User can assign an interview script to a campaign

### Respondent Management

- [ ] **RESP-01**: User can generate unique invite links per respondent or a reusable campaign link
- [ ] **RESP-02**: User can view respondent list per campaign with status (invited, in-progress, completed, dropped)
- [ ] **RESP-03**: User can add respondent details (name, email, notes) before sending invite
- [ ] **RESP-04**: User can send reminders to respondents who haven't completed their interview
- [ ] **RESP-05**: Respondent sees a consent screen before starting the interview

### Interview Configuration

- [ ] **CONF-01**: User can create interview scripts with ordered questions and follow-up rules
- [ ] **CONF-02**: Script builder supports branching logic (if answer contains X, ask Y)
- [ ] **CONF-03**: User can select a voice persona per campaign from a library (Voxtral default + ElevenLabs premium)
- [ ] **CONF-04**: User can select an interviewer style per campaign (Professional, Casual, Empathetic, Direct)
- [ ] **CONF-05**: User can set interview duration target per campaign (10, 15, or 30 minutes)
- [ ] **CONF-06**: User can preview interview script before launching campaign

### Voice Interview — WebRTC

- [ ] **WEBR-01**: Respondent clicks invite link, accepts consent, and begins live voice interview in browser
- [ ] **WEBR-02**: AI interviewer asks questions from the campaign script using selected voice persona
- [ ] **WEBR-03**: AI generates adaptive follow-up questions based on response analysis (Claude)
- [ ] **WEBR-04**: AI gracefully handles off-topic responses, silence, and confusion
- [ ] **WEBR-05**: Real-time transcription displayed during the interview
- [ ] **WEBR-06**: Interview audio is recorded and stored in Supabase Storage
- [ ] **WEBR-07**: Respondent can use text input as fallback during voice interview
- [ ] **WEBR-08**: Interview respects the campaign duration target with graceful time management

### Voice Interview — WhatsApp

- [ ] **WHAP-01**: Respondent receives WhatsApp message with interview invitation link
- [ ] **WHAP-02**: Bot sends interview questions as voice messages via WhatsApp
- [ ] **WHAP-03**: Respondent replies with voice messages at their own pace (async)
- [ ] **WHAP-04**: Bot transcribes voice responses and selects adaptive follow-up questions
- [ ] **WHAP-05**: Interview state persists between async message exchanges
- [ ] **WHAP-06**: Bot sends thank-you message and marks interview complete when done
- [ ] **WHAP-07**: WhatsApp integration uses open-source solution (Kapso/WAHA/similar) with migration path to official API

### Analysis & Reporting

- [ ] **ANAL-01**: Per-interview analysis auto-generates after interview completion (themes, sentiment, key quotes, summary)
- [ ] **ANAL-02**: Cross-campaign analysis extracts patterns and themes across all interviews in a campaign
- [ ] **ANAL-03**: Analysis uses two-stage pipeline: structured extraction per interview, then synthesis across campaign
- [ ] **ANAL-04**: Cross-campaign analysis includes theme frequency, sentiment trends, and representative quotes with source attribution
- [ ] **ANAL-05**: User can export per-interview and per-campaign reports to PDF
- [ ] **ANAL-06**: User can define custom report templates specifying focus areas and sections
- [ ] **ANAL-07**: Auto-generated generic analysis is always included alongside custom template output
- [ ] **ANAL-08**: User can view per-interview transcript with speaker labels and timestamps

### Dashboard & UX

- [x] **DASH-01**: Dark-first UI with electric violet accent, inspired by Factory.ai/Linear/Vercel aesthetic
- [x] **DASH-02**: Responsive design works on desktop and mobile browsers
- [ ] **DASH-03**: Landing page communicates value proposition and links to signup
- [x] **DASH-04**: Dashboard navigation: Campaigns, Reports, Settings
- [ ] **DASH-05**: Interview room UI shows transcript, mic controls, elapsed timer, and text fallback input

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Billing & Payments

- **BILL-01**: Stripe integration for per-interview or subscription billing
- **BILL-02**: Usage tracking dashboard showing interviews consumed and cost
- **BILL-03**: Tiered pricing (Starter, Pro, Agency)

### Advanced Features

- **ADVN-01**: Role-based access control (admin, researcher, viewer) within organizations
- **ADVN-02**: Real-time monitoring dashboard — watch live as AI conducts interviews
- **ADVN-03**: Full-text search across all transcripts in a campaign
- **ADVN-04**: English language support (interviews + analysis)
- **ADVN-05**: Custom voice cloning — client uploads voice sample for persona
- **ADVN-06**: Google Docs / Notion export for reports
- **ADVN-07**: Migration to official WhatsApp Business Cloud API
- **ADVN-08**: Agency logo on PDF reports (light white-labeling)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in participant recruitment panel | Cold-start problem; panel quality is a full business. Use BYOP (bring your own participants) via invite links |
| Video interviews (face-on-camera) | Massive complexity; audio-only is the differentiator, not video |
| Synthetic/simulated user interviews | Undermines core value of real human insights; research professionals distrust synthetic data |
| Real-time collaborative transcript editing | Enormous complexity for v1; transcripts are reference material |
| Survey builder / quantitative research | Different product category; stay qualitative-first |
| Native mobile app | Web app works on mobile browsers; PWA if needed |
| Multi-language within same campaign | Massively increases complexity; one language per campaign |
| Freeform AI personality fine-tuning | Prompt engineering rabbit hole; preset styles cover 80% of needs |
| Zapier/API integrations | Premature for near-zero users; PDF export covers "get data out" needs |
| Full white-labeling / custom branding | Significant frontend complexity; agency logo on PDFs only in v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| CAMP-01 | Phase 2 | Pending |
| CAMP-02 | Phase 2 | Pending |
| CAMP-03 | Phase 2 | Pending |
| CAMP-04 | Phase 2 | Pending |
| CAMP-05 | Phase 2 | Pending |
| RESP-01 | Phase 2 | Pending |
| RESP-02 | Phase 2 | Pending |
| RESP-03 | Phase 2 | Pending |
| RESP-04 | Phase 2 | Pending |
| RESP-05 | Phase 2 | Pending |
| CONF-01 | Phase 2 | Pending |
| CONF-02 | Phase 2 | Pending |
| CONF-03 | Phase 2 | Pending |
| CONF-04 | Phase 2 | Pending |
| CONF-05 | Phase 2 | Pending |
| CONF-06 | Phase 2 | Pending |
| WEBR-01 | Phase 3 | Pending |
| WEBR-02 | Phase 3 | Pending |
| WEBR-03 | Phase 3 | Pending |
| WEBR-04 | Phase 3 | Pending |
| WEBR-05 | Phase 3 | Pending |
| WEBR-06 | Phase 3 | Pending |
| WEBR-07 | Phase 3 | Pending |
| WEBR-08 | Phase 3 | Pending |
| WHAP-01 | Phase 5 | Pending |
| WHAP-02 | Phase 5 | Pending |
| WHAP-03 | Phase 5 | Pending |
| WHAP-04 | Phase 5 | Pending |
| WHAP-05 | Phase 5 | Pending |
| WHAP-06 | Phase 5 | Pending |
| WHAP-07 | Phase 5 | Pending |
| ANAL-01 | Phase 4 | Pending |
| ANAL-02 | Phase 4 | Pending |
| ANAL-03 | Phase 4 | Pending |
| ANAL-04 | Phase 4 | Pending |
| ANAL-05 | Phase 4 | Pending |
| ANAL-06 | Phase 4 | Pending |
| ANAL-07 | Phase 4 | Pending |
| ANAL-08 | Phase 4 | Pending |
| DASH-01 | Phase 1 | Complete |
| DASH-02 | Phase 1 | Complete |
| DASH-03 | Phase 1 | Pending |
| DASH-04 | Phase 1 | Complete |
| DASH-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation*
