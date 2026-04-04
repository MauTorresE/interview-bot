# Project Research Summary

**Project:** EntrevistaAI
**Domain:** AI-conducted voice interview and user research SaaS
**Researched:** 2026-04-04
**Confidence:** MEDIUM-HIGH

## Executive Summary

EntrevistaAI is a multi-tenant SaaS that uses AI to conduct qualitative research interviews via real-time voice (WebRTC) and asynchronous WhatsApp voice messages. The product targets LATAM market research agencies who currently pay $150+ per human-moderated interview. The competitive landscape includes Outset (video/text AI interviews, enterprise), GreatQuestion (all-in-one research platform), and Yazi (WhatsApp-only). No competitor combines live WebRTC voice interviews with WhatsApp async voice in a single platform -- that is the core differentiator.

The recommended approach builds on a proven prototype: LiveKit Agents framework orchestrating a Deepgram STT, Claude LLM, and Voxtral TTS pipeline for real-time voice interviews, with a Next.js dashboard on Vercel and Supabase for multi-tenant data. The architecture is a two-runtime system: Next.js frontend (Vercel) for the dashboard and respondent pages, and a Python backend (Railway) running the LiveKit agent worker, WhatsApp webhook handler, and analysis workers. All async work flows through Supabase pgmq queues. The script engine uses a directed graph stored as JSONB, making interview scripts data-driven rather than hardcoded. WhatsApp should use the official Cloud API only -- all unofficial libraries carry unacceptable ban risk.

The top risks are: (1) cumulative voice pipeline latency exceeding conversational thresholds when STT, LLM, and TTS are chained, requiring streaming TTS and latency budgets from day one; (2) cross-interview analysis hallucination where Claude fabricates themes or quotes across multiple transcripts, requiring a two-stage extraction approach with source attribution; and (3) Supabase RLS misconfiguration silently leaking tenant data, requiring automated cross-tenant isolation tests on every deploy. WhatsApp integration via unofficial libraries is explicitly rejected -- it should be deferred to post-MVP and built exclusively on the official Meta Business API.

## Key Findings

### Recommended Stack

The stack is largely pre-decided and validated by the existing prototype. Core technologies are Next.js 15 (App Router) on Vercel for the frontend, Python 3.11+ on Railway for the agent/backend, Supabase for Postgres/Auth/Storage, LiveKit Cloud for WebRTC, Deepgram Nova-3 for STT (excellent es-419 support), Claude Sonnet for interview logic and analysis, and a dual TTS strategy with Voxtral as default ($0.016/1k chars, 70ms latency) and ElevenLabs as premium tier. All choices carry HIGH confidence -- they are either already proven in the prototype or have first-class LiveKit integrations.

**Core technologies:**
- **Next.js 15 + Tailwind 4**: Dashboard and respondent interview pages -- dark-first UI, App Router for server components
- **LiveKit Agents 1.5.1**: Voice pipeline orchestration -- VoicePipelineAgent with STT/LLM/TTS plugins
- **Deepgram Nova-3**: Speech-to-text -- sub-7% streaming WER, proven es-419 (Latin American Spanish) support
- **Claude Sonnet 4.x**: Interview logic and structured insight extraction -- function calling for themes, quotes, sentiment
- **Voxtral TTS**: Default voice -- 10-14x cheaper than ElevenLabs, 70ms latency, voice cloning with 3s reference
- **ElevenLabs**: Premium voice tier -- superior quality, Mexican accent voices, official LiveKit plugin
- **Supabase**: Multi-tenant Postgres with RLS, Auth, Storage, pgmq job queues
- **@react-pdf/renderer**: PDF report generation -- JSX-based, server-side rendering in Next.js API routes

### Expected Features

**Must have (table stakes):**
- Multi-tenant auth with org-level role-based access
- Campaign/study creation and management with lifecycle (Draft, Active, Paused, Completed)
- Interview script builder with questions, ordering, branching, follow-up rules
- AI voice interview via WebRTC (core differentiator, prototype exists)
- Real-time transcription with speaker diarization
- Per-interview analysis (themes, sentiment, key quotes, summary)
- Cross-interview thematic analysis across a campaign
- PDF report export (per-interview and per-campaign)
- Respondent management with unique invite links
- Campaign dashboard with progress indicators

**Should have (competitive differentiators):**
- Dual-channel interviews (WebRTC + WhatsApp) in one platform
- Adaptive follow-up questioning driven by Claude
- Voice persona selection (Voxtral default + ElevenLabs premium)
- Spanish-first / LATAM focus with Mexican accent voices
- Cost transparency ($1.25-2.50/interview vs $150+ human moderators)

**Defer (v2+):**
- WhatsApp voice interviews (defer to post-MVP; requires Meta Business API verification)
- Participant recruitment panel (let clients bring their own respondents)
- Video interviews, screen-share, survey builder
- Custom report templates, white-labeling, Stripe billing
- Multi-language within same campaign, API integrations

### Architecture Approach

The system uses a layered architecture: Client Layer (Next.js dashboard + respondent page + WhatsApp webhooks), API Layer (Supabase Edge Functions for CRUD + Python FastAPI for agent operations), Realtime Layer (LiveKit Cloud for WebRTC + WhatsApp async engine), Agent Layer (LiveKit interview agent + analysis workers on Railway), and Data Layer (Supabase Postgres with RLS + Storage). Interview scripts are stored as directed graphs in JSONB and interpreted at runtime by a Python ScriptEngine class. All async work (analysis, report generation, WhatsApp turn processing) flows through Supabase pgmq queues with separate queues per job type and priority.

**Major components:**
1. **Interview Agent (LiveKit Worker)** -- Conducts real-time voice interviews; reads script from dispatch metadata; stateless per-session
2. **Script Engine** -- Python state machine interpreting JSONB question graphs; shared between WebRTC and WhatsApp channels
3. **TTS Router** -- Adapter pattern selecting Voxtral or ElevenLabs per campaign configuration
4. **Analysis Worker** -- Background queue consumer; per-interview extraction via Claude structured outputs, cross-campaign synthesis via Claude Batch API
5. **Multi-tenant Data Layer** -- Supabase Postgres with org_id denormalized on every table; RLS via JWT app_metadata claim

### Critical Pitfalls

1. **Voice pipeline latency exceeding conversational threshold** -- Chain of STT + LLM + TTS regularly exceeds 1.5-2s. Mitigate with streaming TTS (start speaking as LLM tokens arrive), P90/P99 latency budgets, OpenTelemetry tracing from day one, and filler phrases ("Hmm, interesante...") to mask spikes.

2. **Unofficial WhatsApp libraries causing account bans** -- All open-source WhatsApp libraries (Baileys, whatsapp-web.js, WAHA) violate ToS; Meta is actively banning accounts since January 2026. Mitigate by using only the official WhatsApp Cloud API and deferring WhatsApp to post-MVP.

3. **Cross-interview analysis hallucination** -- LLMs fabricate themes and quotes when synthesizing across multiple transcripts (up to 75% hallucinated content in multi-doc summaries). Mitigate with two-stage approach (per-interview structured extraction first, then synthesize across structured data), mandatory source attribution, and verification UI.

4. **Supabase RLS silently leaking tenant data** -- Missing or misconfigured RLS on any table exposes all tenants' data with no error. Mitigate with automated cross-tenant isolation test suite running on every deploy, denormalized org_id on every table, and never exposing service_role key to frontend.

5. **Interview completion rate collapse** -- AI interviews over 10-12 minutes see dramatic drop-off. Mitigate with enforced time budgets (default 10 min), adaptive depth reduction as time runs out, silence handling (re-engage after 3s, offer skip after 10s), and progress indicators.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Auth + Schema + Dashboard Shell)
**Rationale:** Every component reads/writes tenant-scoped data. RLS and auth must be correct before any feature code. The PITFALLS research identifies RLS misconfiguration as a critical risk that must be addressed first.
**Delivers:** Working multi-tenant auth, Supabase schema with RLS, org creation/membership, basic Next.js dashboard shell with auth flow.
**Addresses:** Multi-tenant auth, campaign dashboard skeleton, respondent management data model.
**Avoids:** RLS tenant data leak (Pitfall 5) by building automated isolation tests upfront. Consent data model established early (Pitfall 4).

### Phase 2: Core Voice Interview (WebRTC)
**Rationale:** The prototype already proves this pipeline works. This phase productionizes it with the ScriptEngine, TTS Router, and proper transcript persistence. It is the core differentiator.
**Delivers:** End-to-end AI voice interview via browser -- respondent clicks link, AI conducts interview, transcript saved.
**Addresses:** AI voice interview (WebRTC), real-time transcription, interview script execution, single voice persona (Voxtral).
**Avoids:** Voice pipeline latency (Pitfall 1) by building with streaming TTS and latency instrumentation from the start. Interview completion collapse (Pitfall 6) by implementing time budgets and silence handling.

### Phase 3: Campaign Management + Script Builder UI
**Rationale:** With interviews working end-to-end, the dashboard needs UI for researchers to create campaigns, build scripts, manage respondents, and generate invite links. This can be built in parallel with Phase 2 backend work.
**Delivers:** Full campaign lifecycle UI, visual script builder, respondent management with invite links, campaign progress dashboard.
**Addresses:** Campaign creation/management, interview script builder, respondent management, invite links, campaign dashboard.
**Avoids:** No major pitfalls, but design script builder to enforce time budgets (Pitfall 6 prevention).

### Phase 4: Analysis Pipeline + Reports
**Rationale:** Requires real transcripts from Phase 2 to test. Per-interview analysis is the "so what" that makes the product valuable beyond just recording interviews. Cross-campaign analysis is where the real competitive value lives.
**Delivers:** Automated per-interview insights (themes, sentiment, quotes, summary), cross-campaign thematic analysis, PDF report export.
**Addresses:** Per-interview analysis, cross-interview thematic analysis, PDF report export.
**Avoids:** Cross-interview hallucination (Pitfall 3) by building two-stage extraction with source attribution and verification UI. Uses Claude Batch API for cross-analysis (50% cost savings).

### Phase 5: WhatsApp Channel (Post-MVP)
**Rationale:** Requires Meta Business API verification (2-4 week lead time). Shares ScriptEngine and analysis pipeline with WebRTC channel. Should only be built after core web interview is validated with pilot agencies.
**Delivers:** Async voice interview via WhatsApp voice messages, webhook-driven state machine, shared analysis pipeline.
**Addresses:** WhatsApp voice interviews, dual-channel support.
**Avoids:** WhatsApp account bans (Pitfall 2) by using only official Cloud API. Async webhook pattern (return 200 immediately, process via pgmq) avoids the synchronous processing anti-pattern.

### Phase 6: Premium Features + Polish
**Rationale:** These features add value but are not needed for initial validation. Build when pilot agencies request them.
**Delivers:** ElevenLabs premium voice integration, real-time interview monitoring, transcript search, voice persona library.
**Addresses:** Voice persona library, real-time monitoring, transcript search, custom report templates.
**Avoids:** N/A -- these are enhancement features with well-understood patterns.

### Phase Ordering Rationale

- **Schema/Auth first** because every other component depends on tenant-scoped data access. RLS bugs found later are exponentially more expensive to fix.
- **WebRTC interview before WhatsApp** because the prototype already validates LiveKit; WhatsApp requires external API approval with weeks of lead time. Start the Meta Business API application during Phase 1.
- **Analysis after core interview** because you need real transcripts to test and validate the extraction pipeline. Testing with synthetic data produces false confidence.
- **Campaign management UI can overlap with voice pipeline work** since they have different developers (frontend vs backend). The suggested ordering is logical dependency, not strict sequence.
- **Cross-campaign analysis last in the analysis phase** because it requires multiple completed interviews and is the hardest problem (hallucination risk).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Voice Interview):** Latency optimization is empirical -- needs benchmarking with real Spanish speakers on various network conditions. VAD tuning for Spanish pause patterns needs testing.
- **Phase 4 (Analysis):** Cross-interview synthesis prompts need iteration. Hallucination detection and source attribution verification need prototype testing with real transcripts.
- **Phase 5 (WhatsApp):** Meta Business API verification process, webhook architecture details, voice message format handling, and 24-hour session window constraints all need investigation during planning.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Supabase multi-tenant RLS is well-documented with established patterns. Next.js Auth integration is standard.
- **Phase 3 (Campaign Management):** Standard CRUD UI with well-understood patterns from competitor analysis.
- **Phase 6 (Premium Features):** ElevenLabs integration is a drop-in LiveKit plugin. Monitoring and search are standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Nearly all technologies pre-decided and validated in prototype. Official docs and first-class integrations for all components. |
| Features | MEDIUM-HIGH | Strong competitor analysis with 8+ platforms reviewed. MVP scope is clear. Some uncertainty around what pilot agencies will actually prioritize. |
| Architecture | HIGH | Detailed component design with code-level patterns. LiveKit dispatch, pgmq queues, RLS strategy all well-documented. Build order is dependency-driven. |
| Pitfalls | MEDIUM-HIGH | Multiple corroborating sources for each pitfall. WhatsApp ban risk is evolving rapidly (Meta enforcement changing). Latency thresholds are empirical and need validation. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **WhatsApp official API feasibility:** The research strongly recommends against unofficial libraries but does not detail the Meta Business API verification process, timeline, or cost. This needs investigation before Phase 5 planning.
- **Voxtral TTS in production at scale:** Voxtral launched March 2026 -- there is limited production deployment data at scale. Monitor for reliability issues during Phase 2.
- **Spanish VAD tuning:** Deepgram's Voice Activity Detection needs tuning for Spanish conversational patterns (different pause lengths than English). No specific tuning parameters found in research -- needs empirical testing.
- **Audio storage cost trajectory:** Supabase Pro includes limited storage. At scale (3,000+ interviews), migration to S3/R2 will be needed. Plan the migration path during Phase 1 schema design.
- **Consent/GDPR architecture:** Research identifies this as critical but the detailed consent data model (withdrawal mechanism, retention policies, audit trail) needs legal review for LATAM jurisdictions specifically.
- **PDF generation approach divergence:** STACK.md recommends @react-pdf/renderer (JSX, Next.js API routes) while ARCHITECTURE.md recommends WeasyPrint (HTML/CSS, Python/Railway). Decision needed: generate PDFs in Next.js or Python. Recommendation: use @react-pdf/renderer for on-demand dashboard exports and WeasyPrint for background batch report generation, or pick one. Resolve during Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/) -- agent framework, dispatch, sessions
- [LiveKit ElevenLabs Integration](https://docs.livekit.io/agents/integrations/elevenlabs/) -- TTS plugin
- [Deepgram Nova-3 Spanish](https://deepgram.com/learn/deepgram-expands-nova-3-with-spanish-french-and-portuguese-support) -- STT capabilities
- [Voxtral TTS Documentation](https://docs.mistral.ai/models/voxtral-tts-26-03) -- TTS pricing, latency, features
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- multi-tenant patterns
- [Supabase pgmq Queues](https://supabase.com/docs/guides/queues) -- job queue architecture
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- analysis extraction
- [Claude Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing) -- cross-analysis cost optimization
- [@react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer) -- PDF generation

### Secondary (MEDIUM confidence)
- [Outset AI Platform](https://outset.ai/) -- competitor analysis
- [Yazi WhatsApp AI Interviewer](https://www.askyazi.com/product/whatsapp-ai-interviewer) -- competitor analysis
- [GreatQuestion AI Moderated Interviews](https://greatquestion.co/features/ai-moderated-interviews) -- competitor analysis
- [WAHA WhatsApp HTTP API](https://github.com/devlikeapro/waha) -- evaluated and rejected for ban risk
- [Meta Blocks Third-Party AI Chatbots 2026](https://chatboq.com/blogs/third-party-ai-chatbots-ban) -- WhatsApp enforcement
- [Multi-Document Summarization Hallucination](https://arxiv.org/html/2410.13961v1) -- hallucination rates
- [HireVue Completion Rate Data](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf) -- interview duration limits

### Tertiary (LOW confidence)
- [Voice AI Pipeline Latency Budget](https://www.channel.tel/blog/voice-ai-pipeline-stt-tts-latency-budget) -- latency thresholds (single source)
- [GDPR Voice Recordings as Biometric Data](https://summitnotes.app/blog/gdpr-voice-recordings-biometric-data/) -- legal interpretation (needs legal review)

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
