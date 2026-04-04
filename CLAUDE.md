<!-- GSD:project-start source:PROJECT.md -->
## Project

**EntrevistaAI**

A voice-cloned AI agent SaaS that conducts structured interviews with customers, employees, or users via web call or WhatsApp voice messages — then generates actionable insight reports. Clients upload interview scripts, select voice personas, run campaigns of interviews, and get cross-interview analysis with themes, sentiment, and key quotes. Built on a proven LiveKit + Claude + Voxtral voice interview prototype.

**Core Value:** Any organization can run professional-quality research interviews at scale — 24/7, in any timezone, at 90% less cost than human interviewers — without sacrificing conversational depth or structured analysis.

### Constraints

- **Tech stack**: Next.js + Tailwind (frontend), Supabase (auth + DB + storage), LiveKit (WebRTC), Python agent (Railway), Deepgram (STT), Claude API (LLM), Voxtral + ElevenLabs (TTS) — matches proven prototype stack
- **Deployment**: Vercel (frontend) + Railway (Python agent) + LiveKit Cloud + Supabase Cloud
- **Language**: Spanish-first, English deferred to v2
- **Prototype reuse**: Copy and evolve voice pipeline from consultoria_ale — don't rebuild what works
- **Supabase**: New schema in same project — share infrastructure, separate data
- **Budget**: Free beta, no payment processing needed for v1
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework & Frontend
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x | Frontend framework | Already decided. App Router for server components, API routes for PDF generation. Matches team expertise. | HIGH |
| Tailwind CSS | 4.x | Styling | Already decided. Dark-first UI with violet accent. Utility-first matches the Factory/Linear aesthetic. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for a multi-tenant SaaS with complex data models. | HIGH |
| Vercel | -- | Frontend hosting | Already decided. Pairs with Next.js natively, edge functions for low-latency API routes. | HIGH |
### Voice Pipeline (Real-time Interview)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| LiveKit Agents | 1.5.1 | Voice agent framework | Proven in prototype. VoicePipelineAgent orchestrates STT -> LLM -> TTS pipeline. Official plugins for all providers. | HIGH |
| LiveKit Cloud | -- | WebRTC SFU | Already decided. Managed infrastructure, no self-hosting headaches. | HIGH |
| Deepgram Nova-3 | latest | STT (Spanish es-419) | Proven in prototype. Nova-3 GA since Feb 2025 with Spanish support (April 2025). Sub-7% streaming WER, 54% lower than competitors. No reason to switch. | HIGH |
| Claude Sonnet | 4.x | LLM (interview logic) | Already decided. Function calling for structured insight extraction. Handles follow-up logic, off-topic detection, theme extraction. | HIGH |
### Text-to-Speech (Dual Provider)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Voxtral TTS (Mistral) | voxtral-tts-26-03 | Default/budget TTS | $0.016/1k chars (~10-14x cheaper than ElevenLabs). 70ms latency. 9 languages including Spanish. Open-weight model. Voice cloning with 3s reference audio. Proven in prototype. | HIGH |
| livekit-plugins-elevenlabs | 1.5.1 | Premium TTS via LiveKit | Official LiveKit plugin. Drop-in replacement in VoicePipelineAgent. Supports `eleven_turbo_v2_5` model for low latency (75ms). Mexican Spanish accent voices available. | HIGH |
| ElevenLabs API | latest | Premium TTS provider | Superior voice quality, broader voice library, professional Mexican accent voices. Use for premium tier. Flash v2.5 for real-time, Multilingual v2 for highest quality. | HIGH |
### Database & Auth
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase | -- | Postgres + Auth + Storage | Already decided. Multi-tenant via RLS policies. Auth handles email/password signup. Storage for audio files and PDF reports. | HIGH |
| Supabase Edge Functions | -- | Webhooks, background tasks | Lightweight serverless for WhatsApp webhook handling, scheduled campaign reminders. | MEDIUM |
### Backend (Python Agent)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.11+ | Agent runtime | Required by LiveKit Agents framework (>=3.10). 3.11+ for performance improvements. | HIGH |
| Railway | -- | Agent hosting | Already decided. Always-on process for LiveKit agent. Supports Python natively. | HIGH |
| FastAPI | 0.115+ | API endpoints | Async Python web framework for WhatsApp webhooks, analysis endpoints. Pairs well with Railway. | HIGH |
### WhatsApp Integration
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **WAHA (recommended)** | 2026.3 | WhatsApp HTTP API | Docker-deployable REST API wrapping multiple engines (WEBJS, NOWEB, GOWS). 6.2k GitHub stars. Free core tier. Swagger docs + OpenAPI schema for easy integration. Deploy on Railway alongside Python agent. | MEDIUM |
### PDF Generation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@react-pdf/renderer** | 4.3.x | Report PDF export | React-first approach -- build PDFs with JSX components matching your Next.js stack. 15.9k GitHub stars, 860k weekly downloads. Works server-side in Next.js API routes. | HIGH |
### Cross-Interview Analysis
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Claude API (structured output) | latest | Theme extraction & synthesis | Use Claude's structured outputs (JSON mode or tool use) to extract themes, sentiment, quotes from each transcript. Then batch-process across campaign for cross-interview synthesis. No external NLP library needed. | HIGH |
## Deep Dives
### 1. WhatsApp Open-Source Integration Options
#### Option Comparison
| Library | GitHub Stars | Last Updated | Language | Architecture | Ban Risk |
|---------|-------------|--------------|----------|-------------|----------|
| **whatsapp-web.js** | 21.5k | Mar 2026 | JavaScript | Puppeteer (browser automation) | HIGH - simulates browser |
| **Baileys (WhiskeySockets)** | 8.8k | Nov 2025 (v7.0.0-rc.9) | TypeScript | WebSocket (no browser) | MEDIUM - lighter footprint |
| **WAHA** | 6.2k | Mar 2026 | Docker/REST | Wraps WEBJS + NOWEB + GOWS | MEDIUM - abstracts engine choice |
| **Evolution API** | 7.7k | Active 2026 | TypeScript | REST API wrapping Baileys | MEDIUM - same underlying risk |
#### Recommendation: WAHA
- Requires headless Chromium (heavy resource usage on Railway)
- 21.5k stars is misleading -- many stars from bot builders, not production SaaS
- Higher ban risk due to browser simulation pattern that WhatsApp actively detects
- Lower-level WebSocket library requiring significant wrapper code
- v7.0.0 still in RC stage (last RC was Nov 2025)
- You'd end up building what WAHA already provides
- All options violate WhatsApp Terms of Service
- Ban detection has increased significantly in 2025-2026
- Mitigation: Use only for 1:1 opt-in conversations (respondent-initiated), avoid bulk messaging, rate-limit to 20-50 messages/day initially, use conversational (not template) message patterns
- Long-term plan: Migrate to Meta Business API when access is secured
- Consider making WhatsApp a Phase 2 feature to reduce launch risk
### 2. ElevenLabs + LiveKit Integration
- Set `ELEVEN_API_KEY` in `.env`
- `eleven_turbo_v2_5` for real-time interviews (75ms latency)
- `eleven_multilingual_v2` for highest quality (higher latency, better for async/WhatsApp)
- Supports `use_tts_aligned_transcript=True` for frontend transcription sync
- ElevenLabs also offers STT if you want to experiment, but Deepgram Nova-3 is better for Spanish
- Mexican Spanish accent voices available in ElevenLabs voice library
### 3. PDF Generation for Reports
| Option | Verdict | Reason |
|--------|---------|--------|
| **@react-pdf/renderer** | USE THIS | JSX components match your Next.js stack. Server-side rendering in API routes. 15.9k stars, actively maintained (v4.3.2, Jan 2026). |
| pdfmake | Good alternative | JSON-declarative syntax, 940k weekly downloads. Use if you find JSX approach limiting for complex table layouts. |
| Puppeteer/Playwright | AVOID | Requires headless Chromium -- 200MB+ deployment size, slow cold starts on Vercel, deployment timeouts. Overkill for structured reports. |
| jsPDF | AVOID | Client-side focused, poor server-side support, limited layout capabilities for complex reports. |
- `InterviewReport` -- Single interview: transcript, themes, key quotes, sentiment, executive summary
- `CampaignReport` -- Cross-interview: aggregated themes, sentiment trends, pattern matrix, respondent comparison
- Shared: Header with campaign branding, page numbers, table of contents for long reports
### 4. Cross-Interview Analysis Patterns
- For campaigns with <50 interviews (typical for target users): Single Claude call with all extractions works fine within context window
- For larger campaigns: Chunk into groups of 20, synthesize each group, then meta-synthesize
- Store per-interview structured extractions in Supabase JSONB columns for re-analysis without re-processing
- Claude already handles theme extraction, sentiment analysis, and synthesis better than traditional NLP for Spanish qualitative data
- Adding tools like spaCy or NLTK would add complexity without meaningful accuracy gains
- The structured output guarantee from Claude's tool_use means you get reliable, parseable JSON every time
- No model fine-tuning or training data needed -- Claude works zero-shot on interview transcripts
### 5. STT/TTS Landscape Update (Since Prototype)
#### STT: Stick with Deepgram Nova-3
- Nova-3 reached full GA with Spanish support (April 2025)
- 54% lower streaming WER vs competitors
- Sub-7% streaming WER on tested workloads
- New competitors: AssemblyAI Slam-1 (Oct 2025, multilingual streaming), Soniox (highest accuracy in benchmarks), OpenAI gpt-4o-mini-transcribe (Dec 2025)
#### TTS: Voxtral Got a Major Upgrade
- Voxtral TTS officially launched March 23, 2026 (was likely pre-release during prototype)
- 4B parameter open-weight model
- $0.016/1k chars -- 10-14x cheaper than ElevenLabs
- 70ms model latency
- Voice cloning with just 3 seconds of reference audio
- 9 languages including Spanish with accent preservation
- Available via API and as open weights on Hugging Face (CC BY NC 4.0)
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| WhatsApp | WAHA | Baileys direct | Too low-level; you'd rebuild WAHA's REST wrapper yourself |
| WhatsApp | WAHA | whatsapp-web.js direct | Requires headless Chromium, heavy resources, higher ban risk |
| WhatsApp | WAHA | Evolution API | Viable but more opinionated (n8n integration focus), heavier stack |
| PDF | @react-pdf/renderer | Puppeteer | Headless Chromium too heavy for Vercel, slow cold starts |
| PDF | @react-pdf/renderer | pdfmake | Good alternative if JSX approach doesn't work for complex tables; keep as fallback |
| STT | Deepgram Nova-3 | AssemblyAI Slam-1 | No LiveKit plugin, unproven for es-419 specifically |
| STT | Deepgram Nova-3 | OpenAI gpt-4o-mini-transcribe | No LiveKit plugin, unclear Spanish performance |
| TTS (budget) | Voxtral | Coqui/local models | Voxtral is already dirt cheap via API, no need to self-host |
| TTS (premium) | ElevenLabs | PlayHT | ElevenLabs has first-class LiveKit plugin, better Mexican Spanish voices |
| Analysis | Claude structured output | spaCy + custom NLP | Claude handles Spanish qualitative analysis better zero-shot than any trainable pipeline |
| DB | Supabase | PlanetScale | Supabase already chosen; switching adds complexity for no gain |
## Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `livekit-plugins-deepgram` | 1.5.1 | Deepgram STT in LiveKit | Every real-time interview |
| `livekit-plugins-anthropic` | 1.5.1 | Claude LLM in LiveKit | Every real-time interview |
| `livekit-plugins-elevenlabs` | 1.5.1 | ElevenLabs TTS in LiveKit | Premium voice campaigns |
| `@supabase/supabase-js` | 2.x | Supabase client for Next.js | All frontend DB/auth operations |
| `supabase-py` | 2.x | Supabase client for Python | Agent-side DB operations |
| `zustand` | 5.x | Client state management | Dashboard UI state (campaigns, filters) |
| `@tanstack/react-query` | 5.x | Server state management | Data fetching, caching, optimistic updates |
| `react-hook-form` | 7.x | Form handling | Campaign creation, script builder, settings |
| `zod` | 3.x | Schema validation | Shared validation between forms and API |
| `date-fns` | 4.x | Date formatting | Interview timestamps, campaign dates (Spanish locale) |
| `lucide-react` | latest | Icons | Consistent icon set for dark UI |
## Installation
# Frontend (Next.js)
# Python Agent
## Sources
### Official Documentation (HIGH confidence)
- [LiveKit Agents Framework](https://docs.livekit.io/agents/)
- [LiveKit ElevenLabs Integration](https://docs.livekit.io/agents/integrations/elevenlabs/)
- [livekit-plugins-elevenlabs v1.5.1 on PyPI](https://pypi.org/project/livekit-plugins-elevenlabs/)
- [Voxtral TTS Documentation](https://docs.mistral.ai/models/voxtral-tts-26-03)
- [Voxtral TTS Launch Announcement](https://mistral.ai/news/voxtral-tts)
- [Deepgram Nova-3 Spanish Expansion](https://deepgram.com/learn/deepgram-expands-nova-3-with-spanish-french-and-portuguese-support)
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [@react-pdf/renderer on npm](https://www.npmjs.com/package/@react-pdf/renderer)
- [ElevenLabs Mexican Accent Voices](https://elevenlabs.io/text-to-speech/mexican-accent)
### GitHub Repositories (HIGH confidence)
- [WAHA - WhatsApp HTTP API](https://github.com/devlikeapro/waha) -- 6.2k stars
- [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) -- 8.8k stars
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) -- 21.5k stars
- [Evolution API](https://github.com/EvolutionAPI/evolution-api) -- 7.7k stars
- [diegomura/react-pdf](https://github.com/diegomura/react-pdf) -- 15.9k stars
### Benchmark & Comparison Sources (MEDIUM confidence)
- [Deepgram STT Benchmarks 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026)
- [AssemblyAI STT Comparison 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [Soniox Benchmarks](https://soniox.com/benchmarks)
- [JavaScript PDF Libraries Guide 2025](https://www.nutrient.io/blog/javascript-pdf-libraries/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
