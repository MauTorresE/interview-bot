# EntrevistaAI

## What This Is

A voice-cloned AI agent SaaS that conducts structured interviews with customers, employees, or users via web call or WhatsApp voice messages — then generates actionable insight reports. Clients upload interview scripts, select voice personas, run campaigns of interviews, and get cross-interview analysis with themes, sentiment, and key quotes. Built on a proven LiveKit + Claude + Voxtral voice interview prototype.

## Core Value

Any organization can run professional-quality research interviews at scale — 24/7, in any timezone, at 90% less cost than human interviewers — without sacrificing conversational depth or structured analysis.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant auth with Supabase (email/password signup, users see only their campaigns)
- [ ] Campaign creation: name, interview script (questions + branching logic), voice persona, language, duration target
- [ ] Interview script builder: upload or create structured question sets with follow-up logic
- [ ] Voice persona library: Voxtral (default/cheap) + ElevenLabs (premium) with custom cloning option
- [ ] Web-based live interview via WebRTC (LiveKit): respondent clicks link, talks to AI interviewer
- [ ] WhatsApp voice message interview flow (async, respondent answers when convenient)
- [ ] Adaptive follow-up questions: Claude analyzes responses and selects contextual next questions
- [ ] Graceful handling of off-topic responses, silence, confusion
- [ ] Real-time transcription of all responses (Deepgram STT, Spanish es-419)
- [ ] Structured insight extraction via Claude function calling (themes, pain points, quotes, sentiment)
- [ ] Per-interview analysis: auto-generated report with transcript, themes, key quotes, executive summary
- [ ] Cross-interview analysis: theme extraction across campaign, sentiment trends, pattern identification
- [ ] Custom report templates: client defines report focus alongside auto-generated generic analysis
- [ ] Export reports to PDF
- [ ] Management dashboard: campaign overview, interview status, respondent management, invite links
- [ ] Real-time response monitoring during active interviews
- [ ] Respondent management: unique invite links, reminders
- [ ] Spanish-first with English support planned for v2

### Out of Scope

- Billing/payments — free beta first, add Stripe after validation
- Multi-language within same campaign — Spanish-only for v1
- Mobile native app — web-first, responsive design
- Video interviews — audio-only for v1
- Advanced sentiment analysis with NLP models — Claude-based analysis sufficient for v1
- API access for third-party integrations — dashboard-only for v1
- Custom branding per tenant — single EntrevistaAI brand for v1
- Google Docs / Notion export — PDF only for v1

## Context

**Existing prototype:** `consultoria_ale/agent/` contains a working LiveKit voice agent with Deepgram STT, Claude Sonnet LLM, Voxtral TTS (custom Mexican Spanish voice clone), and Supabase persistence. The prototype is single-tenant with a hardcoded 5-phase consulting interview. Key reusable components: `voxtral_tts.py` (SSE streaming adapter), LiveKit agent pipeline wiring, frontend interview room UX patterns, and the two-pass report generation pipeline.

**Database:** Same Supabase project as consultoria_ale but new schema. Existing tables (interviews, transcript_entries, interview_insights, reports) will be expanded for multi-tenant campaigns.

**Voice providers:** Voxtral (Mistral) as default — cheap ($0.40/interview), proven. ElevenLabs as premium option for higher-quality voices and broader voice library.

**WhatsApp:** No Meta Business API access yet. Will research open-source WhatsApp integration alternatives with good GitHub star ratings during research phase.

**Design direction:** Dark-first UI with electric violet accent color. Inspired by Factory.ai, Linear, and Vercel — monochrome base, generous whitespace, subtle purposeful motion, system/Geist font stack, information hierarchy through weight/opacity. Minimal chrome, premium developer-tool aesthetic adapted for research professionals.

**Target users:**
- Primary: UX research agencies, product consultancies (50-200 interviews/month)
- Secondary: Startup founders doing customer discovery (5-20 interviews)
- Tertiary: HR departments for satisfaction surveys, exit interviews

**Cost per interview:** ~$1.25-2.50 depending on voice provider (Voxtral vs ElevenLabs)

## Constraints

- **Tech stack**: Next.js + Tailwind (frontend), Supabase (auth + DB + storage), LiveKit (WebRTC), Python agent (Railway), Deepgram (STT), Claude API (LLM), Voxtral + ElevenLabs (TTS) — matches proven prototype stack
- **Deployment**: Vercel (frontend) + Railway (Python agent) + LiveKit Cloud + Supabase Cloud
- **Language**: Spanish-first, English deferred to v2
- **Prototype reuse**: Copy and evolve voice pipeline from consultoria_ale — don't rebuild what works
- **Supabase**: New schema in same project — share infrastructure, separate data
- **Budget**: Free beta, no payment processing needed for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Voxtral + ElevenLabs dual TTS | Voxtral is cheap and proven for default; ElevenLabs offers premium quality and broader voice library | -- Pending |
| Supabase Auth over custom auth | Already using Supabase for DB; integrated auth reduces complexity | -- Pending |
| Free beta before billing | Validate product-market fit before adding payment complexity | -- Pending |
| Dark-first UI with violet accent | Matches reference sites user admires (Factory, Linear, Vercel); premium AI-tool positioning | -- Pending |
| Same Supabase project, new schema | Reduces infrastructure management; clear separation via schema | -- Pending |
| Spanish-first | Existing voice clone is Mexican Spanish; target market is LATAM initially | -- Pending |
| Copy voice pipeline from prototype | Proven LiveKit + Deepgram + Voxtral + Claude integration; don't rebuild working code | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after initialization*
