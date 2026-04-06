# Phase 3: Voice Interview - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Live AI voice interviews via WebRTC (LiveKit). Respondents click an invite link, accept consent (already built in Phase 2), and have a natural, adaptive voice conversation with an AI interviewer. The interview room displays real-time transcription, mic controls, elapsed timer, and a text fallback input. Audio is recorded and stored. The Python agent is adapted from the proven prototype to support multi-tenant SaaS — dynamic campaign config, research brief-driven prompts, voice persona selection, and generic insight extraction tools.

</domain>

<decisions>
## Implementation Decisions

### Interview Room UX
- **D-01:** Centered conversation layout — transcript centered like a chat view, mic/timer controls at bottom. Clean, focused, matches the dark-first aesthetic.
- **D-02:** Real-time transcript always visible — scrolls as conversation happens, speaker labels distinguish AI vs respondent.
- **D-03:** Text fallback input always visible at bottom — text input bar available below transcript at all times, like a chat app. No toggle needed.
- **D-04:** Interview ending: AI ends naturally with closing summary per the research brief + respondent has a visible "Terminar entrevista" button to end early at any time.

### Agent Architecture
- **D-05:** Agent reads campaign config from Supabase at session start — reads research brief, voice persona, interviewer style, and duration target using interview/room metadata. One source of truth.
- **D-06:** Research brief → system prompt via template injection — base system prompt template (proven pattern from prototype) with placeholders for the 4 brief sections (goals, data points, context, tone). Interviewer style modifies the personality section of the template.
- **D-07:** Voice persona selection via provider switch at agent init — reads voice persona from campaign config. Voxtral persona → VoxtralTTS. ElevenLabs persona → livekit-plugins-elevenlabs. Decision happens once at session start.
- **D-08:** Generic insight function tools — replace prototype's domain-specific tools with generic ones: note_theme, note_quote, note_sentiment, transition_phase, end_interview. Works for any research domain.

### Connection & Session Flow
- **D-09:** Same page view swap after consent — `/interview/[token]` page transitions from consent form to interview room UI after consent submission. No page navigation, smoother UX.
- **D-10:** LiveKit room tokens generated via Next.js API route — server-side API route (e.g., `/api/livekit/token`) generates LiveKit participant token using LiveKit Server SDK. Keeps secrets on server, works with Vercel.
- **D-11:** Auto-reconnect with state recovery — LiveKit's built-in reconnection handles WebRTC layer. If reconnection succeeds, interview continues (agent keeps state in memory). If it fails after timeout, mark interview as 'dropped'.

### Recording & Transcript Storage
- **D-12:** Audio recording via LiveKit Egress to Supabase Storage — use LiveKit's Composite or Track Egress to record full audio. After interview, upload recording file to Supabase Storage. Offloads recording from the agent.
- **D-13:** New `entrevista.interviews` and `entrevista.transcript_entries` tables — interviews table: id, campaign_id, respondent_id, org_id, status, started_at, ended_at, duration_seconds, recording_url. Transcript entries: id, interview_id, speaker, text, elapsed_ms. Both with org_id for RLS.
- **D-14:** Agent writes transcript entries to Supabase in real-time — same as prototype (on_user_turn_completed + conversation_item_added events). Entries available immediately for the dashboard.

### Claude's Discretion
- Mic permission handling UX (prompt flow, error states)
- Mobile responsiveness of interview room
- Loading states and connection progress indicators
- Visual feedback during AI speaking vs listening (waveform, avatar, pulse animation)
- Time management warnings (approaching duration target)
- Off-topic response handling prompts in the system prompt template
- Silence detection and gentle re-engagement behavior
- Error states (agent disconnect, Supabase write failures)
- Interview room header design (logo, timer placement, campaign name)
- Exact function tool parameter schemas for generic insight tools
- LiveKit Egress configuration details (composite vs track, format)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, prototype reuse directive, voice provider strategy (Voxtral default + ElevenLabs premium)
- `.planning/REQUIREMENTS.md` — WEBR-01..08 and DASH-05 requirements with acceptance criteria
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, requirement mapping

### Phase 1 & 2 Decisions (carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Dashboard layout (D-01..D-03), visual identity (D-04..D-08), dark-first theme
- `.planning/phases/02-campaign-script-builder/02-CONTEXT.md` — Research brief model (D-04..D-08), voice persona config (D-12..D-14), campaign status model

### Prototype Reference (CRITICAL — copy and evolve)
- `C:\Users\Waniboko\consultoria_ale\agent\entrevista_agent.py` — Full LiveKit voice agent: Deepgram STT + Claude LLM + VoxtralTTS + function tools + transcript persistence + data channel text input
- `C:\Users\Waniboko\consultoria_ale\agent\voxtral_tts.py` — Custom Voxtral TTS SSE streaming adapter for LiveKit (no official plugin exists)
- `C:\Users\Waniboko\consultoria_ale\agent\interview_config.py` — System prompt template + question bank structure (reference for brief → prompt mapping)
- `C:\Users\Waniboko\consultoria_ale\agent\interview_state.py` — Interview state machine for phase transitions
- `C:\Users\Waniboko\consultoria_ale\agent\supabase_client.py` — Supabase persistence helpers (transcript entries, insights, status updates)

### Existing Frontend Integration Points
- `src/app/interview/[token]/page.tsx` — Token validation + consent page (already built — extend for interview room)
- `src/app/interview/[token]/consent-form.tsx` — Consent form component (transitions to interview room after consent)
- `src/app/interview/[token]/actions.ts` — Server actions for consent recording
- `src/lib/constants/campaign.ts` — Voice personas, interviewer styles, duration options (agent needs to map these)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/interview/[token]/` — Consent flow already built: token validation, consent form, server actions. Extend this route for the interview room.
- `src/components/ui/` — Full shadcn/ui component library (Button, Card, Progress, Badge, etc.)
- `consultoria_ale/agent/entrevista_agent.py` — Proven LiveKit agent with Deepgram STT, Claude LLM, Voxtral TTS, data channel handling. Copy and evolve.
- `consultoria_ale/agent/voxtral_tts.py` — Custom TTS adapter. Copy as-is.
- `src/lib/supabase/admin.ts` — Admin Supabase client (used for token validation — extend for interview data)

### Established Patterns
- Server Actions for mutations (auth, campaigns, consent)
- RLS with `entrevista.get_org_id()` for tenant isolation — new interview tables need org_id
- shadcn/ui + Tailwind for all UI components
- Data channel for text input in prototype (JSON messages via LiveKit data channel)
- Supabase admin client for public-facing pages (no user auth context for interview pages)

### Integration Points
- `/interview/[token]` page needs to swap from consent form → interview room component after consent
- New API route needed: `/api/livekit/token` for generating LiveKit participant tokens
- New Supabase migration: `entrevista.interviews` and `entrevista.transcript_entries` tables
- Python agent deployed on Railway — needs new repo/directory for the multi-tenant version
- LiveKit Cloud configuration needed for Egress (recording)
- Agent needs `@livekit/components-react` on the frontend for WebRTC connection

</code_context>

<specifics>
## Specific Ideas

- The prototype at `consultoria_ale/agent/` is the primary reference. The directive is "copy and evolve — don't rebuild what works."
- Research brief sections (goals, data points, context, tone) from Phase 2 map directly to how the prototype's `interview_config.py` structures its system prompt — the template approach preserves this proven pattern.
- The 4 voice personas defined in `src/lib/constants/campaign.ts` (voxtral-natalia, voxtral-diego, elevenlabs-sofia, elevenlabs-marco) need corresponding TTS configuration in the agent.
- The prototype's data channel handling for text input (`on_data` listener for `text_input` and `end_interview` message types) should be reused.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-voice-interview*
*Context gathered: 2026-04-06*
