# Pitfalls Research

**Domain:** AI Voice Interview SaaS (EntrevistaAI)
**Researched:** 2026-04-04
**Confidence:** MEDIUM-HIGH (multiple sources corroborate most findings; some areas like WhatsApp enforcement are evolving rapidly)

## Critical Pitfalls

### Pitfall 1: Cumulative Voice Pipeline Latency Exceeding Conversational Threshold

**What goes wrong:**
Individual components (Deepgram STT ~150ms, Claude LLM ~300-800ms, Voxtral/ElevenLabs TTS ~75-200ms) look fine in isolation, but the cascaded pipeline regularly exceeds 1.5-3 seconds end-to-end. At 500ms+ delay, conversations feel robotic. At 2s+, respondents lose their train of thought and give shorter, lower-quality answers. At 5s+, the interview feels broken.

**Why it happens:**
Teams test components individually but not the full pipeline under real network conditions. LLM inference accounts for 60-70% of total latency, and it compounds with network jitter, STT endpoint detection delay, and TTS buffering. The existing prototype may feel "fast enough" with a single user on a good connection but degrades with concurrent sessions or variable network quality.

**How to avoid:**
- Stream TTS output before the LLM finishes (start speaking as tokens arrive). The prototype already uses SSE streaming for Voxtral -- ensure this is preserved and optimized.
- Set hard latency budgets: P90 under 1.5s for first audio byte, P99 under 3.5s. Alert on P99, not averages.
- Instrument the full pipeline with OpenTelemetry distributed tracing from day one: User speaks -> STT -> LLM -> TTS -> Audio played back.
- Pre-warm LLM connections. Use connection pooling for Claude API calls.
- Consider a "thinking indicator" (brief filler phrase like "Hmm, interesante..." or "Dejame pensar...") to mask latency spikes naturally.

**Warning signs:**
- Respondents giving increasingly short answers as interview progresses (latency fatigue).
- Interview recordings showing 2+ second silences between respondent finishing and AI responding.
- Higher drop-off rates on mobile / cellular connections vs desktop / WiFi.

**Phase to address:**
Voice pipeline phase (initial build). Latency instrumentation must be built into the pipeline from the start, not bolted on later. Revisit during scaling/optimization phase.

---

### Pitfall 2: Unofficial WhatsApp Libraries Causing Account Bans and Service Disruption

**What goes wrong:**
Open-source WhatsApp libraries (Baileys, whatsapp-web.js, Evolution API) work by simulating WhatsApp Web sessions using reverse-engineered protocols. Meta actively detects and bans these. Numbers get permanently banned without warning, often within days of deployment. Starting January 2026, Meta is enforcing new rules that explicitly block third-party chatbots from operating via WhatsApp, even through the official Business API for general-purpose bots.

**Why it happens:**
The official WhatsApp Business API requires Meta Business verification, a BSP (Business Solution Provider) partnership, and template message approval -- a process that takes 2-4 weeks and costs money. Open-source libraries offer instant gratification with zero approval process, so developers build on them and discover the ban risk only in production.

**How to avoid:**
- Do NOT use unofficial libraries (Baileys, whatsapp-web.js, Evolution API) for any production feature. The PROJECT.md mentions researching "open-source WhatsApp integration alternatives with good GitHub star ratings" -- this path leads directly to bans.
- Use the official WhatsApp Cloud API through a BSP like 360dialog, Twilio, or MessageBird. Budget 2-4 weeks for Meta Business verification.
- Design the WhatsApp flow as async voice message exchanges (respondent sends voice note, AI processes and responds with voice note) since this fits within WhatsApp's messaging model.
- Have a fallback plan: if WhatsApp gets blocked or restricted, the web-based LiveKit interview must work as the primary channel.

**Warning signs:**
- Phone numbers getting "restricted" status in WhatsApp Business Manager.
- Quality rating dropping below "Medium" in Meta's dashboard.
- Sudden inability to send messages to new contacts.
- GitHub issues on the library repo about "ban waves."

**Phase to address:**
This is a phase-gating decision. WhatsApp integration should be deferred to a later phase (after MVP web interviews work) and must use the official API from day one. Do not prototype with unofficial libraries -- the prototype habit will become the production architecture.

---

### Pitfall 3: Cross-Interview Analysis Hallucination and Theme Fabrication

**What goes wrong:**
LLMs asked to synthesize themes across multiple interview transcripts hallucinate patterns that don't exist, fabricate quotes, and generate confident-sounding insights with no grounding. Research shows up to 75% of content in LLM-generated multi-document summaries can be hallucinated, with hallucinations increasing toward the end of summaries. This is catastrophic for a research product -- clients make business decisions based on these insights.

**Why it happens:**
Cross-document synthesis is fundamentally harder than single-document extraction. As the number of transcripts grows, the LLM's context window fills up, grounding degrades, and the model starts pattern-matching against its training data rather than the actual transcripts. Claude's 200K context window helps but does not eliminate the problem. The model also tends to over-identify themes (seeing patterns where randomness exists) because summarization training rewards finding connections.

**How to avoid:**
- Use a two-stage approach: first extract structured data per-interview (themes, quotes, sentiment) using Claude with structured outputs, then synthesize across the already-extracted structured data rather than raw transcripts.
- Always include source attribution: every theme must link to specific quotes from specific interviews. If the model cannot cite a source, the theme gets flagged.
- Set a maximum interview count per analysis batch (start with 20-30). For larger campaigns, use hierarchical summarization (batch -> batch summaries -> meta-summary).
- Build a verification UI that lets clients click any theme and see the supporting quotes in context.
- Include confidence scores per theme based on how many interviews support it.

**Warning signs:**
- Generated themes that sound generic ("respondents value quality" type insights that could apply to anything).
- Quotes in reports that don't match any transcript verbatim.
- Theme count staying suspiciously constant regardless of how many interviews are analyzed.
- Clients reporting insights that contradict what they heard in individual interview recordings.

**Phase to address:**
Analysis pipeline phase. The per-interview extraction should be built and validated first (easier, more reliable). Cross-interview synthesis is a separate, harder problem that needs its own validation cycle with real data.

---

### Pitfall 4: Consent and Data Privacy Violations in HR/Research Contexts

**What goes wrong:**
Voice recordings are treated as regular data when they're actually biometric data under GDPR (if speaker identification is used) and sensitive personal data in most jurisdictions. A passive "this call is being recorded" banner does not constitute valid GDPR consent. HR use cases (exit interviews, employee satisfaction) face additional scrutiny because consent cannot be "freely given" in employer-employee relationships due to power imbalance. Violations carry fines up to 4% of global annual turnover or 20M EUR.

**Why it happens:**
Developers treat consent as a checkbox UI problem rather than a legal architecture problem. The consent requirements differ dramatically between UX research (relatively straightforward -- external participants, clear opt-in) and HR use cases (complex -- employee power dynamics, works councils, DPIAs required). Teams build for UX research, then bolt on HR features without rearchitecting consent flows.

**How to avoid:**
- Build consent as a first-class system, not a UI checkbox: record when consent was given, what was consented to, and allow withdrawal (with deletion of recordings).
- Implement explicit, active consent at interview start: respondent must verbally confirm or click to agree before recording begins. Store the consent event as an auditable record.
- Separate storage and processing consent: "I agree to be recorded" is different from "I agree to AI analysis of my recording."
- Build data retention policies from day one: auto-delete recordings after configurable period per campaign.
- For HR use cases (deferred, but design for it): require a DPIA (Data Protection Impact Assessment) workflow, ensure human-in-the-loop for any decisions, and document that consent is truly optional.
- Keep all data in a single region (Supabase region selection matters).

**Warning signs:**
- No way for respondents to withdraw consent and have their data deleted post-interview.
- Recordings stored indefinitely with no retention policy.
- Same consent flow used for UX research and HR contexts.
- No audit trail of when/how consent was obtained.

**Phase to address:**
Must be addressed in the auth/multi-tenant phase and interview flow phase. Consent architecture is foundational -- retrofitting it is a rewrite. The actual GDPR compliance features (DPIA workflows, data portability) can come later, but the consent data model must be right from the start.

---

### Pitfall 5: Supabase RLS Policies Silently Leaking Tenant Data

**What goes wrong:**
A missing or misconfigured RLS policy on even one table exposes all tenants' data. Common failure modes: forgetting to enable RLS on a new table, writing a policy that uses `auth.uid()` when tenant isolation requires `tenant_id` from a join or JWT claim, or using the `service_role` key in client-side code (which bypasses RLS entirely). The SQL Editor in Supabase dashboard bypasses RLS, so developers test there and assume their queries work correctly for regular users.

**Why it happens:**
RLS is invisible when it works and invisible when it fails. There's no error -- you just get back data you shouldn't see. Developers add new tables during feature development and forget to add RLS policies. Complex queries with joins can bypass RLS if the joined table lacks its own policies. The Supabase service_role key (needed for admin operations) accidentally leaks into client bundles.

**How to avoid:**
- Create a tenant isolation test suite that runs on every deploy: create two test tenants, insert data for each, verify tenant A cannot see tenant B's data across ALL tables.
- Use a database migration checklist: every new table must have RLS enabled and a tenant-scoping policy before the migration is considered complete.
- Always test RLS from the client SDK, never the SQL Editor.
- Store `tenant_id` (or `org_id`) on every row that needs isolation, and always filter by it in RLS policies. Index these columns.
- Wrap `auth.uid()` in a subquery for performance: `(SELECT auth.uid())` evaluates once instead of per-row.
- Never expose `service_role` key to the frontend. Use Edge Functions or a backend for admin operations.
- Audit RLS policies regularly: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;` to find unprotected tables.

**Warning signs:**
- Dashboard queries returning more data than expected.
- New tables added without corresponding RLS migration.
- `service_role` key appearing in any frontend environment variable.
- No automated tests for tenant isolation.

**Phase to address:**
Auth/multi-tenant phase (the very first phase). RLS architecture is the foundation. Write the tenant isolation test suite before writing any feature code.

---

### Pitfall 6: Interview Completion Rates Collapsing Due to Length and UX Failures

**What goes wrong:**
AI voice interviews longer than 10-12 minutes see dramatic drop-off. Industry data shows the ideal duration is 6-10 minutes with a hard ceiling at 12. Beyond that, respondent fatigue sets in -- answers get shorter, more generic, and less useful. Combined with latency issues (Pitfall 1), rigid scripted delivery, and poor error recovery, completion rates can drop below 50%.

**Why it happens:**
Interview designers (the SaaS clients) create scripts optimized for human interviews (30-45 minutes) and expect AI to run the same length. The platform doesn't enforce time budgets. The AI doesn't adapt its questioning strategy when it detects fatigue signals. Silence handling is poor -- a 3-second silence after a question makes respondents think the system crashed.

**How to avoid:**
- Enforce maximum interview duration in the campaign builder (default 10 min, max 15 min) with clear warnings about completion rate impact.
- Build a "time budget" system: the AI tracks elapsed time and remaining questions, adjusting depth of follow-ups accordingly.
- Implement graceful degradation: if running long, the AI prioritizes must-ask questions and skips nice-to-haves.
- Handle silence explicitly: after 3 seconds of silence, the AI should gently re-engage ("Take your time" or rephrase the question). After 10 seconds, offer to skip.
- Show a subtle progress indicator (WebRTC channel) so respondents know how far along they are.
- Track completion rates per campaign and surface them prominently in the dashboard.

**Warning signs:**
- Average interview duration exceeding 12 minutes.
- Drop-off spiking at specific questions (indicates a confusing or sensitive question).
- Respondents answering "I don't know" or giving one-word answers in the last third.
- Completion rates below 70%.

**Phase to address:**
Interview flow/adaptive logic phase. The time budget and graceful degradation must be designed alongside the question branching logic, not added after.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing full audio in Supabase Storage instead of dedicated object storage | Simpler architecture, single vendor | Supabase Pro plan includes only 100GB storage; at ~2MB/min and 15-min interviews, 100GB holds only ~3,300 interviews. Egress costs compound. | MVP only (under 500 interviews). Migrate to S3/R2 before scaling. |
| Hardcoding Claude model version | Faster development | Claude model updates may change behavior, break structured outputs, or alter analysis quality. No A/B testing possible. | Never -- always use a config variable for model version. |
| Single Supabase project for prototype + production | Less infrastructure to manage | Shared rate limits, shared connection pool, prototype data polluting production, harder to isolate issues. | During initial development only. Separate before any real users. |
| Skipping audio compression/transcoding | Faster pipeline, fewer moving parts | Raw audio files 5-10x larger than compressed. Storage costs multiply. Playback issues on different devices. | Never -- always transcode to Opus or AAC on ingest. |
| Using Claude for simple keyword extraction instead of structured outputs | Works quickly for demos | Inconsistent extraction format, failed parses, silent data loss. | Never after structured outputs are available (they are now in public beta). |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LiveKit + Deepgram STT | Not tuning VAD (Voice Activity Detection) sensitivity, causing the AI to interrupt respondents mid-thought or wait too long after they finish | Tune VAD `min_silence_duration` per language (Spanish has different pause patterns than English). Test with real Spanish speakers, not just English. |
| Claude Structured Outputs | Using deeply nested schemas that hit edge cases in constrained decoding | Keep extraction schemas flat (max 2 levels of nesting). Use enums for categorical fields. Validate outputs server-side even with structured outputs enabled. |
| Voxtral TTS SSE Streaming | Not handling stream interruption gracefully -- if respondent interrupts, the TTS stream must be cancelled immediately or audio queues up | Implement barge-in detection: on respondent speech detection, immediately cancel pending TTS audio chunks. The prototype's `voxtral_tts.py` SSE adapter needs explicit cancellation support. |
| Supabase Auth + RLS | Using `auth.uid()` directly in RLS policies when the data model is organization-based (user belongs to org, org owns campaigns) | Create a helper function `get_user_org_id()` that looks up the user's org from a membership table. Use this in RLS policies instead of raw `auth.uid()`. |
| ElevenLabs Premium TTS | Assuming ElevenLabs latency matches Voxtral -- ElevenLabs has higher quality but ~2x latency for first byte | Always measure TTFB for each provider. Consider pre-generating common phrases (greetings, transitions) for ElevenLabs and only using live generation for dynamic content. |
| Deepgram STT for Spanish (es-419) | Using the generic Spanish model instead of the Latin American variant; not handling code-switching (Spanglish) | Explicitly set `language=es-419` (not `es`). Test with Mexican Spanish speakers who naturally code-switch. Have a fallback for unrecognized segments. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all transcript entries for cross-interview analysis in a single Claude API call | Works fine for 5-10 interviews, context window fills at 30+, costs spike, quality degrades | Hierarchical summarization: extract per-interview, then synthesize across structured extracts | 20-30 interviews per campaign (roughly 100K tokens of transcript) |
| Supabase Realtime subscriptions for interview monitoring without filtering | Every client receives every update across all campaigns | Use Realtime with RLS-enabled channels, filter by campaign_id. Unsubscribe when not viewing. | 10+ concurrent interviews across tenants |
| Storing interview state in LiveKit room metadata | Quick to implement, works in prototype | Room metadata has size limits and isn't persisted across reconnections. Interview state must survive disconnects. | First time a respondent's connection drops mid-interview and they rejoin |
| Running Claude analysis synchronously in the request path | Simple architecture, works for single interviews | Report generation takes 30-60 seconds for complex analysis. HTTP timeouts kill it. | Any interview with more than 10 transcript entries |
| No audio file lifecycle management | Storage grows linearly forever | Implement retention policies: active (hot storage 30 days), archive (cold storage 1 year), delete. Compress on archive. | ~3,000 interviews (100GB Supabase Storage limit on Pro plan) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing interview invite links that don't expire or have usage limits | Anyone with the link can start interviews, consuming API credits and generating garbage data | Links should be single-use or time-limited (24-48 hours). Rate-limit interview starts per link. |
| Storing raw audio without encryption at rest | Voice recordings are biometric data in many jurisdictions; a data breach is a GDPR Article 9 violation | Enable encryption at rest on Supabase Storage. Consider client-side encryption for HR use cases. |
| Claude API key in frontend environment variables | Full API access exposed, unlimited spend possible | All LLM calls must go through the Python backend (Railway). Never expose API keys to the browser. |
| No rate limiting on interview creation | A malicious or buggy client can spin up thousands of concurrent interviews, exhausting LiveKit and LLM quotas | Rate limit per tenant: max concurrent interviews, max interviews per day. Enforce at the API layer. |
| Transcript data in application logs | PII leaks into logging infrastructure (Railway logs, Vercel logs) | Scrub transcript content from logs. Log metadata (interview_id, duration, status) but never content. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Rigid, scripted question delivery with no conversational flexibility | Respondents feel interrogated, not interviewed. Answers become defensive and shallow. | Use Claude's adaptive follow-up capability: branch based on response content, acknowledge what was said before asking the next question ("Interesante lo que mencionas sobre X. Y hablando de..."). |
| "I didn't understand that" error messages | Respondents feel stupid, lose confidence, give up | Use conversational recovery: "Could you tell me more about that?" or rephrase the question. Never blame the respondent. |
| No audio/visual feedback during AI "thinking" time | Respondents think the system crashed, start talking again (which interrupts the pending response), creating a cascading mess | Show a subtle visual indicator on web (pulsing avatar). Play a brief acknowledgment sound. For WhatsApp, send a "typing" indicator. |
| Asking the same question twice after a disconnection/reconnection | Respondent feels the AI "forgot" everything, loses trust | Persist interview state (current question index, all responses so far) in the database, not just in-memory. On reconnect, summarize where you left off: "Before we were disconnected, you were telling me about..." |
| Overwhelming the dashboard client with raw data instead of actionable insights | Research professionals drown in transcripts, can't find the insights they need | Lead with the executive summary and themes. Make transcripts and raw data available but secondary. Default view should be "What did we learn?" not "What did they say?" |

## "Looks Done But Isn't" Checklist

- [ ] **Interview flow:** Often missing graceful handling of "I don't want to answer that" -- verify the AI can skip questions without breaking the script flow
- [ ] **Transcription:** Often missing speaker diarization -- verify transcripts clearly distinguish AI questions from respondent answers, not just a wall of text
- [ ] **Reports:** Often missing source attribution -- verify every theme links to specific quotes with interview IDs
- [ ] **Multi-tenant auth:** Often missing organization-level (not just user-level) data isolation -- verify a user leaving an org loses access to that org's campaigns
- [ ] **WhatsApp flow:** Often missing the 24-hour session window constraint -- verify the async interview handles multi-day response patterns without breaking
- [ ] **Voice personas:** Often missing consistent persona across an entire interview -- verify the AI maintains the same tone, formality level, and speaking style throughout
- [ ] **Campaign management:** Often missing respondent deduplication -- verify the same person can't complete the same interview twice (unless explicitly allowed)
- [ ] **Audio playback:** Often missing cross-browser audio codec support -- verify recordings play back on Safari, Chrome, Firefox, and mobile browsers
- [ ] **Consent flow:** Often missing consent withdrawal mechanism -- verify a respondent can request deletion and all their data (audio, transcript, extracted insights) is actually removed

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Unofficial WhatsApp library ban | HIGH | Register for official WhatsApp Cloud API (2-4 week process). Rebuild message handling against official SDK. Lost phone number cannot be recovered -- get a new one. Notify affected users of channel disruption. |
| RLS data leak discovered | HIGH | Immediate incident response: identify scope of leak, notify affected tenants. Audit all tables for missing policies. Add the automated tenant isolation test suite that should have existed. May require breach notification under GDPR. |
| Cross-interview hallucinated insights delivered to client | MEDIUM | Add source attribution verification (can each theme be traced to real quotes?). Re-run affected analyses with improved prompts. Implement the two-stage extraction approach. Communicate transparently with client. |
| Latency degradation in production | MEDIUM | Add pipeline instrumentation (if missing). Identify bottleneck component. Common fixes: upgrade to faster LLM tier, enable TTS streaming, reduce prompt size, add regional deployment closer to users. |
| Interview completion rates below 50% | MEDIUM | Audit interview scripts for length (enforce 10-min max). Check latency metrics. Review drop-off points. Add time-budget adaptive logic. Often the fix is script design education for clients, not code changes. |
| Audio storage costs spiraling | LOW | Implement compression pipeline (Opus at 32kbps = ~0.24MB/min vs 2MB/min raw). Add lifecycle policies. Move completed interviews to cold storage after 30 days. Retroactively compress existing files. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Voice pipeline latency (P1) | Voice pipeline / core infrastructure | P90 end-to-end latency under 1.5s measured across 100+ test interviews |
| Unofficial WhatsApp bans (P2) | WhatsApp integration phase (use official API only) | Using official WhatsApp Cloud API with verified business account |
| Cross-interview hallucination (P3) | Analysis pipeline phase | Every generated theme has verifiable source quotes; blind review by researcher matches AI output |
| Consent/privacy violations (P4) | Auth + interview flow phases (consent data model early) | Consent audit trail exists; deletion request removes all respondent data within 72 hours |
| RLS tenant data leaks (P5) | Auth/multi-tenant phase (very first phase) | Automated test suite verifies cross-tenant isolation on every deploy |
| Interview completion rate collapse (P6) | Interview flow / adaptive logic phase | Completion rate above 75% across test campaigns with 10+ respondents |
| Audio storage cost spiral | Scaling / optimization phase | Audio compressed on ingest; lifecycle policies active; storage growth rate monitored |
| Claude structured output failures | Voice pipeline / analysis phase | Schema validation on every extraction; fallback retry with simplified schema on parse failure |
| Dashboard information overload | Dashboard / reporting phase | User testing shows researchers find key insights within 30 seconds of opening a report |
| Interview reconnection failures | Voice pipeline phase | Respondents can reconnect within 5 minutes and resume from where they left off |

## Sources

- [Voice AI Pipeline Latency Budget](https://www.channel.tel/blog/voice-ai-pipeline-stt-tts-latency-budget) -- 300ms budget framework
- [WebRTC.ventures: Slow Voicebot Latency Fix](https://webrtc.ventures/2025/10/slow-voicebot-how-to-fix-latency-in-voice-enabled-conversational-voice-ai-agents/) -- production latency patterns
- [LiveKit Agent Monitoring](https://hamming.ai/resources/livekit-agent-monitoring-prometheus-grafana-alerts) -- P90/P99 thresholds and alerting
- [Testing LiveKit Voice Agents in Production](https://hamming.ai/resources/testing-and-monitoring-livekit-voice-agents-production) -- testing blind spots
- [LiveKit Telephony Latency Issue #3685](https://github.com/livekit/agents/issues/3685) -- telephony-specific latency doubling
- [WhatsApp API Rate Limits Scaling Guide](https://www.chatarchitect.com/news/whatsapp-api-rate-limits-what-you-need-to-know-before-you-scale) -- three-layer rate limiting
- [Meta Blocks Third-Party AI Chatbots 2026](https://chatboq.com/blogs/third-party-ai-chatbots-ban) -- January 2026 enforcement
- [GitHub: WhatsApp Blacklisted Providers](https://github.com/yredsmih/whatsapp-blacklisted-providers) -- ban enforcement evidence
- [HireVue: Applicant Dropout/Completion Rates](https://www.hirevue.com/wp-content/uploads/2025/10/2025_10_Applicant-Dropout-Completion-Rates_Whitepaper.pdf) -- 5% discontinuation rate, 6-10 min ideal
- [Avahi: Fair Voice AI Interview Experience](https://avahi.ai/blog/how-to-create-a-fair-and-candidate-centric-voice-ai-interview-experience/) -- UX best practices
- [Supabase RLS Multi-Tenant Deep Dive](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) -- RLS gotchas
- [Supabase RLS Guide: Policies That Work](https://designrevision.com/blog/supabase-row-level-security) -- testing from client SDK
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- constrained decoding for function calling
- [Multi-Document Summarization Hallucination](https://arxiv.org/html/2410.13961v1) -- up to 75% hallucinated content in multi-doc summaries
- [LLM Hallucination in Document Q&A (172B Token Study)](https://arxiv.org/html/2603.08274) -- cross-document aggregation harder than single-doc
- [GDPR Compliance for Voice-to-Text Services](https://www.gdpr-advisor.com/gdpr-compliance-for-voice-to-text-services-and-transcription-platforms/) -- consent requirements
- [GDPR vs CCPA AI Interview Compliance 2025](https://teamfill.net/blog/gdpr-vs-ccpa-for-ai-interview-software-compliance-guide-2025) -- HR-specific compliance
- [Voice Recordings as Biometric Data Under GDPR](https://summitnotes.app/blog/gdpr-voice-recordings-biometric-data/) -- Article 9 implications
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing) -- storage limits and quotas
- [Supabase File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) -- 50MB free, 500GB Pro
- [Voice Interface UX Mistakes](https://frejun.ai/voice-interface-ux-mistakes/) -- conversational design pitfalls
- [VUI Design Principles 2026](https://www.parallelhq.com/blog/voice-user-interface-vui-design-principles) -- silence handling, persona consistency

---
*Pitfalls research for: AI Voice Interview SaaS (EntrevistaAI)*
*Researched: 2026-04-04*
