# Technology Stack

**Project:** EntrevistaAI
**Researched:** 2026-04-04

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

**TTS switching strategy:** Both providers plug into LiveKit's VoicePipelineAgent as TTS plugins. Campaign-level configuration selects Voxtral (default) or ElevenLabs (premium). The existing `voxtral_tts.py` SSE streaming adapter from the prototype handles Voxtral; ElevenLabs uses the official LiveKit plugin.

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

**Full WhatsApp analysis below in dedicated section.**

### PDF Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@react-pdf/renderer** | 4.3.x | Report PDF export | React-first approach -- build PDFs with JSX components matching your Next.js stack. 15.9k GitHub stars, 860k weekly downloads. Works server-side in Next.js API routes. | HIGH |

**Full PDF analysis below in dedicated section.**

### Cross-Interview Analysis

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Claude API (structured output) | latest | Theme extraction & synthesis | Use Claude's structured outputs (JSON mode or tool use) to extract themes, sentiment, quotes from each transcript. Then batch-process across campaign for cross-interview synthesis. No external NLP library needed. | HIGH |

---

## Deep Dives

### 1. WhatsApp Open-Source Integration Options

**Context:** No Meta Business API access. Need to send interview invitations and conduct async voice message interviews via WhatsApp.

#### Option Comparison

| Library | GitHub Stars | Last Updated | Language | Architecture | Ban Risk |
|---------|-------------|--------------|----------|-------------|----------|
| **whatsapp-web.js** | 21.5k | Mar 2026 | JavaScript | Puppeteer (browser automation) | HIGH - simulates browser |
| **Baileys (WhiskeySockets)** | 8.8k | Nov 2025 (v7.0.0-rc.9) | TypeScript | WebSocket (no browser) | MEDIUM - lighter footprint |
| **WAHA** | 6.2k | Mar 2026 | Docker/REST | Wraps WEBJS + NOWEB + GOWS | MEDIUM - abstracts engine choice |
| **Evolution API** | 7.7k | Active 2026 | TypeScript | REST API wrapping Baileys | MEDIUM - same underlying risk |

#### Recommendation: WAHA

**Why WAHA over raw Baileys or whatsapp-web.js:**

1. **REST API abstraction** -- Your Python agent and Next.js frontend can call HTTP endpoints instead of managing WebSocket connections or Puppeteer instances directly. Clean separation of concerns.
2. **Engine flexibility** -- WAHA supports three engines: WEBJS (browser-based, most compatible), NOWEB (WebSocket/Node, lighter), and GOWS (Go WebSocket, newest/fastest). You can switch engines without changing your application code.
3. **Docker-native** -- Deploy on Railway as a separate service alongside your Python agent. One container, production-ready.
4. **Free core tier** -- No message limits, no time limits on the free version. Premium adds multi-session and advanced features.
5. **Swagger/OpenAPI** -- Auto-generated API docs make integration straightforward from any language.

**Why NOT whatsapp-web.js directly:**
- Requires headless Chromium (heavy resource usage on Railway)
- 21.5k stars is misleading -- many stars from bot builders, not production SaaS
- Higher ban risk due to browser simulation pattern that WhatsApp actively detects

**Why NOT raw Baileys directly:**
- Lower-level WebSocket library requiring significant wrapper code
- v7.0.0 still in RC stage (last RC was Nov 2025)
- You'd end up building what WAHA already provides

**CRITICAL WARNING -- Ban Risk for ALL unofficial WhatsApp solutions:**
- All options violate WhatsApp Terms of Service
- Ban detection has increased significantly in 2025-2026
- Mitigation: Use only for 1:1 opt-in conversations (respondent-initiated), avoid bulk messaging, rate-limit to 20-50 messages/day initially, use conversational (not template) message patterns
- Long-term plan: Migrate to Meta Business API when access is secured
- Consider making WhatsApp a Phase 2 feature to reduce launch risk

### 2. ElevenLabs + LiveKit Integration

**Integration is first-class and trivial.**

The `livekit-plugins-elevenlabs` package (v1.5.1, March 2026) provides a drop-in TTS plugin for LiveKit's VoicePipelineAgent:

```python
from livekit.plugins import elevenlabs

tts = elevenlabs.TTS(
    model="eleven_turbo_v2_5",  # Low latency
    voice="<voice_id>",
    # Or use eleven_multilingual_v2 for highest quality
)

agent = VoicePipelineAgent(
    stt=deepgram.STT(language="es"),
    llm=anthropic.LLM(model="claude-sonnet-4-20250514"),
    tts=tts,  # Swap Voxtral for ElevenLabs per campaign config
)
```

**Key details:**
- Set `ELEVEN_API_KEY` in `.env`
- `eleven_turbo_v2_5` for real-time interviews (75ms latency)
- `eleven_multilingual_v2` for highest quality (higher latency, better for async/WhatsApp)
- Supports `use_tts_aligned_transcript=True` for frontend transcription sync
- ElevenLabs also offers STT if you want to experiment, but Deepgram Nova-3 is better for Spanish
- Mexican Spanish accent voices available in ElevenLabs voice library

**Campaign-level TTS switching pattern:**
```python
def get_tts_for_campaign(campaign):
    if campaign.tts_provider == "elevenlabs":
        return elevenlabs.TTS(model="eleven_turbo_v2_5", voice=campaign.voice_id)
    else:
        return voxtral.TTS(voice=campaign.voice_id)  # Your custom adapter
```

### 3. PDF Generation for Reports

**Recommendation: @react-pdf/renderer**

**Why @react-pdf/renderer over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| **@react-pdf/renderer** | USE THIS | JSX components match your Next.js stack. Server-side rendering in API routes. 15.9k stars, actively maintained (v4.3.2, Jan 2026). |
| pdfmake | Good alternative | JSON-declarative syntax, 940k weekly downloads. Use if you find JSX approach limiting for complex table layouts. |
| Puppeteer/Playwright | AVOID | Requires headless Chromium -- 200MB+ deployment size, slow cold starts on Vercel, deployment timeouts. Overkill for structured reports. |
| jsPDF | AVOID | Client-side focused, poor server-side support, limited layout capabilities for complex reports. |

**Implementation pattern for Next.js API route:**

```typescript
// app/api/reports/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { InterviewReport } from '@/components/pdf/InterviewReport';

export async function GET(req, { params }) {
  const report = await getReport(params.id);
  const buffer = await renderToBuffer(<InterviewReport data={report} />);
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${params.id}.pdf"`,
    },
  });
}
```

**PDF report components to build:**
- `InterviewReport` -- Single interview: transcript, themes, key quotes, sentiment, executive summary
- `CampaignReport` -- Cross-interview: aggregated themes, sentiment trends, pattern matrix, respondent comparison
- Shared: Header with campaign branding, page numbers, table of contents for long reports

### 4. Cross-Interview Analysis Patterns

**Recommendation: Two-pass Claude structured output pipeline (no external NLP needed)**

The prototype already uses a two-pass report generation pipeline. Extend this to cross-interview analysis:

**Pass 1 -- Per-interview extraction (already exists in prototype):**
```json
{
  "themes": ["price_sensitivity", "brand_loyalty", "delivery_speed"],
  "sentiment": "mixed",
  "key_quotes": [
    {"text": "...", "theme": "price_sensitivity", "sentiment": "negative"}
  ],
  "pain_points": ["..."],
  "executive_summary": "..."
}
```

Use Claude structured outputs (JSON mode or tool_use) to guarantee schema compliance.

**Pass 2 -- Cross-interview synthesis (new):**
Feed all per-interview extractions into a single Claude call:

```
Given these {n} interview analyses from campaign "{name}":
[... array of Pass 1 outputs ...]

Synthesize:
1. Top recurring themes ranked by frequency
2. Sentiment distribution per theme
3. Contradictions between respondents
4. Most impactful quotes per theme
5. Actionable recommendations
```

**Scaling consideration:**
- For campaigns with <50 interviews (typical for target users): Single Claude call with all extractions works fine within context window
- For larger campaigns: Chunk into groups of 20, synthesize each group, then meta-synthesize
- Store per-interview structured extractions in Supabase JSONB columns for re-analysis without re-processing

**Why NOT external NLP tools:**
- Claude already handles theme extraction, sentiment analysis, and synthesis better than traditional NLP for Spanish qualitative data
- Adding tools like spaCy or NLTK would add complexity without meaningful accuracy gains
- The structured output guarantee from Claude's tool_use means you get reliable, parseable JSON every time
- No model fine-tuning or training data needed -- Claude works zero-shot on interview transcripts

### 5. STT/TTS Landscape Update (Since Prototype)

#### STT: Stick with Deepgram Nova-3

**What's changed since prototype:**
- Nova-3 reached full GA with Spanish support (April 2025)
- 54% lower streaming WER vs competitors
- Sub-7% streaming WER on tested workloads
- New competitors: AssemblyAI Slam-1 (Oct 2025, multilingual streaming), Soniox (highest accuracy in benchmarks), OpenAI gpt-4o-mini-transcribe (Dec 2025)

**Verdict: No reason to switch.** Deepgram Nova-3 is proven in your prototype, has excellent Spanish support, competitive pricing, and first-class LiveKit integration via `livekit-plugins-deepgram`. Switching would mean re-validating the entire voice pipeline for marginal gains.

**Watch:** OpenAI gpt-4o-mini-transcribe for future comparison -- reportedly lower error rates than Whisper, but no LiveKit plugin yet and unclear Spanish es-419 performance.

#### TTS: Voxtral Got a Major Upgrade

**What's changed since prototype:**
- Voxtral TTS officially launched March 23, 2026 (was likely pre-release during prototype)
- 4B parameter open-weight model
- $0.016/1k chars -- 10-14x cheaper than ElevenLabs
- 70ms model latency
- Voice cloning with just 3 seconds of reference audio
- 9 languages including Spanish with accent preservation
- Available via API and as open weights on Hugging Face (CC BY NC 4.0)

**Verdict: Even stronger case for Voxtral as default.** The formal launch with improved voice cloning and low latency reinforces the dual-TTS strategy: Voxtral for budget, ElevenLabs for premium.

---

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

---

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

---

## Installation

```bash
# Frontend (Next.js)
npm install next@15 react react-dom typescript tailwindcss
npm install @supabase/supabase-js @react-pdf/renderer
npm install zustand @tanstack/react-query react-hook-form zod date-fns lucide-react
npm install -D @types/react @types/node

# Python Agent
pip install livekit-agents==1.5.1
pip install livekit-plugins-deepgram==1.5.1
pip install livekit-plugins-anthropic==1.5.1
pip install livekit-plugins-elevenlabs==1.5.1
pip install supabase fastapi uvicorn httpx
```

---

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
