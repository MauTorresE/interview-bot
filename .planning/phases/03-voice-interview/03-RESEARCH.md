# Phase 3: Voice Interview - Research

**Researched:** 2026-04-06
**Domain:** Real-time voice AI interviews via WebRTC (LiveKit) + Python agent + frontend interview room
**Confidence:** HIGH

## Summary

Phase 3 brings the core product to life: respondents click an invite link, pass through a branded lobby with mic check, and have a natural AI-conducted voice interview. The technical surface is broad -- spanning a Next.js frontend interview room with real-time WebRTC audio, a Python LiveKit agent adapted from a proven prototype, new Supabase tables and migrations, LiveKit Cloud recording via Egress, and dashboard enhancements for researchers.

The proven prototype at `consultoria_ale/agent/` provides a solid foundation. The key adaptations are: (1) making the agent multi-tenant by reading campaign config from Supabase at session start, (2) replacing domain-specific function tools with generic insight tools, (3) adding ElevenLabs as an alternative TTS provider via `livekit-plugins-elevenlabs`, and (4) implementing the premium frontend experience with morphing orb, lobby, and completion card.

A critical research finding: LiveKit's `useAgent()` hook (evolved from `useVoiceAssistant`) now automatically exposes agent states (listening, thinking, speaking, connecting) via participant attributes -- eliminating the need for custom data channel messages for the "thinking" state detection described in D-31. The orb visualization can be driven entirely by `useAgent().state` combined with `useTrackVolume()` for amplitude-reactive speaking effects.

**Primary recommendation:** Copy the prototype agent files into a new `agent/` directory in the repo, refactor for multi-tenant SaaS patterns, and build the frontend interview room using `@livekit/components-react` hooks with the `useAgent()` hook as the primary state driver for the orb visualization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Centered conversation layout -- transcript centered like a chat view, mic/timer controls at bottom
- **D-02:** Real-time transcript always visible -- scrolls as conversation happens, speaker labels distinguish AI vs respondent
- **D-03:** Text fallback input always visible at bottom -- text input bar available below transcript at all times
- **D-04:** Interview ending: AI ends naturally with closing summary + respondent has "Terminar entrevista" button
- **D-05:** Agent reads campaign config from Supabase at session start -- research brief, voice persona, interviewer style, duration target
- **D-06:** Research brief to system prompt via template injection -- base template with placeholders for 4 brief sections
- **D-07:** Voice persona selection via provider switch at agent init -- Voxtral or ElevenLabs decided once at session start
- **D-08:** Generic insight function tools -- note_theme, note_quote, note_sentiment, transition_phase, end_interview
- **D-09:** Same page view swap after consent -- no page navigation
- **D-10:** LiveKit room tokens generated via Next.js API route `/api/livekit/token`
- **D-11:** Auto-reconnect with state recovery -- mark as 'dropped' if reconnection fails
- **D-12:** Audio recording via LiveKit Egress to Supabase Storage
- **D-13:** New `entrevista.interviews` and `entrevista.transcript_entries` tables
- **D-14:** Agent writes transcript entries to Supabase in real-time
- **D-15:** Elapsed time injected into system prompt context on every turn
- **D-16:** Two hard guardrails: 80% duration nudge, 95% duration forced closing
- **D-17:** Single Railway process, LiveKit Agents framework handles dispatch, minimum 5 concurrent interviews
- **D-18:** No auto-scaling for MVP
- **D-19:** `/api/livekit/token` performs 4-step atomic flow: lookup respondent, verify status, check no active interview, create interview row + room + return token
- **D-20:** Consent form's "Comenzar" calls this API route
- **D-21:** Start Room Composite Egress when room is created
- **D-22:** Agent or LiveKit webhook stops Egress when interview ends, recording URL saved
- **D-23:** If Egress fails, interview continues uninterrupted -- transcript is primary artifact
- **D-24:** Use `@livekit/components-react` for interview room
- **D-25:** Enhance respondents tab with interview status column, duration, "Ver transcripcion" link
- **D-26:** Transcript viewer at `/campaigns/[id]/interviews/[interviewId]`
- **D-27:** Guided mic check lobby with device selector, level meter, campaign info
- **D-28:** Three-phase page flow: consent -> lobby/mic check -> interview room (300ms fade transitions)
- **D-29:** Morphing violet orb with 4 states (idle, listening, thinking, speaking)
- **D-30:** CSS animations + Web Audio API AnalyserNode for orb -- no WebGL
- **D-31:** Use LiveKit SDK hooks for state detection -- `useIsSpeaking`, `useConnectionState`, data channel for thinking
- **D-32:** Phase indicator below orb -- "Calentamiento" / "Conversacion" / "Cierre" via data channel
- **D-33:** Post-interview completion card with duration, topics count, thank you message
- **D-34:** VAD tuned: min_endpointing_delay=1.0s, prefix_padding_duration=0.3s
- **D-35:** Interruption handling: allow_interruptions=True, false_interruption_timeout=2.0s, resume_false_interruption=True
- **D-36:** No artificial response delay
- **D-37:** Silence re-engagement: user_away_timeout=12.0s, gentle prompts via system prompt

### Claude's Discretion
- Mobile responsiveness of interview room
- Error states (agent disconnect, Supabase write failures, TTS/STT failures)
- Exact function tool parameter schemas for generic insight tools
- Egress format and configuration details (audio codec, file format)
- Transcript viewer page layout and styling
- Off-topic response handling prompts in the system prompt template
- Orb animation fine-tuning (exact blob shape keyframes, glow intensity, color shifts)
- Mic check "audio detected" threshold calibration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEBR-01 | Respondent clicks invite link, accepts consent, begins live voice interview in browser | Frontend three-phase flow (consent->lobby->room), `/api/livekit/token` route, `@livekit/components-react` LiveKitRoom provider |
| WEBR-02 | AI interviewer asks questions from campaign script using selected voice persona | Agent reads campaign config from Supabase, template injection for research brief, voice persona switch (Voxtral custom TTS / ElevenLabs plugin) |
| WEBR-03 | AI generates adaptive follow-up questions based on response analysis | Claude Sonnet as LLM in LiveKit agent, system prompt with research brief goals/data points, proven prototype pattern |
| WEBR-04 | AI gracefully handles off-topic responses, silence, and confusion | System prompt instructions for redirection, VAD tuning (1.0s endpointing), user_away_timeout=12s, re-engagement prompts |
| WEBR-05 | Real-time transcription displayed during interview | Agent writes transcript entries to Supabase via `on_user_turn_completed` + `conversation_item_added`, frontend polls or subscribes via Supabase realtime |
| WEBR-06 | Interview audio recorded and stored in Supabase Storage | LiveKit Room Composite Egress -> S3-compatible Supabase Storage endpoint |
| WEBR-07 | Respondent can use text input as fallback during voice interview | Data channel with `text-input` topic, `session.generate_reply(user_input=text)` on agent side, TextFallbackInput component |
| WEBR-08 | Interview respects campaign duration target with graceful time management | Elapsed time in system prompt context, 80% nudge + 95% forced closing guardrails, InterviewState tracks timing |
| DASH-05 | Interview room UI shows transcript, mic controls, elapsed timer, text fallback input | InterviewRoom component composing TranscriptFeed, InterviewOrb, TextFallbackInput, InterviewTimer, MicMuteToggle |
</phase_requirements>

## Standard Stack

### Core (Frontend -- new packages for Phase 3)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@livekit/components-react` | 2.9.20 | LiveKit React hooks + providers | Official React SDK for LiveKit. Provides `LiveKitRoom`, `useAgent`, `useTrackVolume`, `useIsSpeaking`, `useConnectionState`, `useDataChannel`, `useMediaDeviceSelect`, `useLocalParticipant`. [VERIFIED: npm registry] |
| `livekit-client` | 2.18.1 | LiveKit client SDK (peer dependency) | Required by `@livekit/components-react`. Core WebRTC client. [VERIFIED: npm registry] |
| `livekit-server-sdk` | 2.15.0 | LiveKit server SDK for token generation + Egress | Used in Next.js API routes for `AccessToken`, `RoomServiceClient`, `EgressClient`. Keeps LiveKit secrets server-side. [VERIFIED: npm registry] |

### Core (Python Agent)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `livekit-agents` | 1.5.1 | Voice agent framework | Proven in prototype. `Agent`, `AgentSession`, `cli.run_app()`, `function_tool`. [VERIFIED: PyPI] |
| `livekit-plugins-deepgram` | 1.5.1 | Deepgram STT plugin | Nova-3 Spanish es-419. Proven in prototype. [VERIFIED: PyPI] |
| `livekit-plugins-anthropic` | 1.5.1 | Claude LLM plugin | Claude Sonnet for interview logic. Proven in prototype. [VERIFIED: PyPI] |
| `livekit-plugins-silero` | 1.5.1 | Silero VAD | Voice Activity Detection. Proven in prototype. [VERIFIED: PyPI, matches prototype requirements.txt] |
| `livekit-plugins-elevenlabs` | 1.5.1 | ElevenLabs TTS plugin | Premium voice personas. Official LiveKit plugin, drop-in for VoicePipelineAgent. [VERIFIED: PyPI] |
| `livekit-plugins-mistralai` | 1.5.1 | Mistral AI plugin | Used in prototype requirements but does NOT yet include Voxtral TTS -- only LLM/STT. Custom VoxtralTTS adapter still needed. [VERIFIED: PyPI + GitHub issue #5247 confirms TTS not integrated] |
| `supabase-py` | 2.28+ | Supabase Python client | Agent-side DB operations (transcript entries, insights, status updates). Used in prototype. [VERIFIED: prototype requirements.txt] |
| `httpx` | latest | Async HTTP client | Required by custom VoxtralTTS adapter for SSE streaming from Mistral API. [VERIFIED: prototype voxtral_tts.py uses httpx] |

### Supporting (Frontend -- already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | 2.0.7 | Toast notifications | Connection errors, reconnection status [VERIFIED: package.json] |
| `lucide-react` | 1.7.0 | Icons | Mic, MicOff, SendHorizontal, Check, etc. [VERIFIED: package.json] |
| `date-fns` | 4.1.0 | Date formatting | Interview timestamps in transcript viewer [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom VoxtralTTS adapter | Wait for `livekit-plugins-mistralai` TTS | Not available yet (GitHub issue #5247 opened 2026-03-27). Custom adapter is proven in prototype. [VERIFIED: GitHub] |
| `useAgent()` for state detection | Custom data channel messages for thinking state | `useAgent()` provides automatic state detection via `lk.agent.state` participant attribute. Cleaner than manual data channel. D-31 mentions data channel for thinking but `useAgent()` already handles this. |
| `useVoiceAssistant()` | `useAgent()` | `useAgent()` is the evolved version with better error handling and pre-connect buffering. Both available, `useAgent()` is newer. [CITED: docs.livekit.io/frontends/build/agent-state/] |
| Supabase Realtime subscriptions for transcript | Polling | Realtime subscriptions would be more elegant but add complexity. Polling every 2-3s is simpler for MVP since transcript entries are written by the agent. [ASSUMED] |

**Installation:**
```bash
# Frontend (Next.js)
npm install @livekit/components-react livekit-client livekit-server-sdk

# Python Agent (new requirements.txt in agent/ directory)
pip install livekit-agents~=1.5 livekit-plugins-deepgram~=1.5 livekit-plugins-anthropic~=1.5 livekit-plugins-silero~=1.5 livekit-plugins-elevenlabs~=1.5 supabase~=2.28 httpx python-dotenv~=1.0 mistralai~=1.12
```

## Architecture Patterns

### Recommended Project Structure

```
# New files for Phase 3
agent/                           # Python agent (new directory at repo root)
  entrevista_agent.py            # Multi-tenant agent (evolved from prototype)
  voxtral_tts.py                 # Custom Voxtral TTS adapter (copied from prototype)
  interview_state.py             # Interview state machine (evolved from prototype)
  interview_prompts.py           # System prompt template + style modifiers
  supabase_client.py             # Supabase persistence (evolved from prototype)
  requirements.txt               # Python dependencies
  Dockerfile                     # Railway deployment
  .env.example                   # Required environment variables

src/
  app/
    api/
      livekit/
        token/route.ts           # LiveKit token + interview creation + Egress start
        webhook/route.ts         # LiveKit webhook for Egress completion
    interview/[token]/
      page.tsx                   # Extended: manages 4-phase flow state
      consent-form.tsx           # Existing (modify to trigger API call)
      lobby-screen.tsx           # NEW: mic check, device selector, campaign info
      interview-room.tsx         # NEW: main interview room orchestrator
      completion-card.tsx        # NEW: post-interview thank you
    (dashboard)/
      campaigns/[id]/
        interviews/[interviewId]/
          page.tsx               # NEW: transcript viewer
  components/
    interview/
      interview-orb.tsx          # Morphing violet orb with 4 states
      mic-level-meter.tsx        # Horizontal volume bar
      transcript-feed.tsx        # Scrolling transcript with speaker labels
      text-fallback-input.tsx    # Always-visible text input
      interview-timer.tsx        # Elapsed / target display
      phase-indicator.tsx        # Current conversation phase label

supabase/
  migrations/
    004_interviews.sql           # interviews + transcript_entries tables
```

### Pattern 1: Multi-Tenant Agent Session

**What:** Each agent session reads campaign configuration from Supabase at startup, building a dynamic system prompt and selecting the correct TTS provider.

**When to use:** Every interview session -- the agent is generic, configuration comes from the database.

**Example:**
```python
# Source: Evolved from prototype entrevista_agent.py
async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    participant = await ctx.wait_for_participant()

    # Extract interview_id from room metadata
    room_name = ctx.room.name  # format: "interview-{interview_id}"
    interview_id = room_name.replace("interview-", "")

    # Load campaign config from Supabase
    config = await load_interview_config(interview_id)
    # config contains: research_brief, voice_persona, interviewer_style,
    #                  duration_target_minutes, respondent_name

    # Build system prompt from template + research brief
    system_prompt = build_system_prompt(
        brief=config.research_brief,
        style=config.interviewer_style,
        duration=config.duration_target_minutes,
    )

    # Select TTS provider based on voice persona
    if config.voice_persona.startswith("elevenlabs"):
        tts = elevenlabs.TTS(
            model="eleven_turbo_v2_5",
            voice=ELEVENLABS_VOICES[config.voice_persona],
        )
    else:
        tts = VoxtralTTS(
            model="voxtral-mini-tts-2603",
            voice=VOXTRAL_VOICES[config.voice_persona],
        )

    agent = EntrevistaAgent(
        instructions=system_prompt,
        interview_id=interview_id,
        config=config,
        tts_provider=tts,
    )
    # ... start session
```
[ASSUMED — based on prototype patterns, specific API surface verified]

### Pattern 2: Token Route as Interview Session Factory (D-19)

**What:** The `/api/livekit/token` API route performs a 4-step atomic operation: validate respondent, create interview row, create LiveKit room, start Egress, and return participant token.

**When to use:** Called once when respondent clicks "Comenzar entrevista" after consent.

**Example:**
```typescript
// Source: LiveKit server SDK docs + Supabase admin client pattern
import { AccessToken, RoomServiceClient, EgressClient, EncodedFileOutput, S3Upload } from 'livekit-server-sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const { token } = await req.json()
  const admin = createAdminClient()

  // Step 1: Look up respondent
  const { data: respondent } = await admin
    .from('respondents')
    .select('id, status, campaign_id, name, org_id')
    .eq('invite_token', token)
    .single()

  if (!respondent || respondent.status !== 'in_progress') {
    return Response.json({ error: 'invalid' }, { status: 400 })
  }

  // Step 2: Check no active interview exists
  const { data: existing } = await admin
    .from('interviews')
    .select('id')
    .eq('respondent_id', respondent.id)
    .eq('status', 'active')
    .single()

  if (existing) {
    return Response.json({ error: 'already_active' }, { status: 409 })
  }

  // Step 3: Create interview row
  const { data: interview } = await admin
    .from('interviews')
    .insert({
      campaign_id: respondent.campaign_id,
      respondent_id: respondent.id,
      org_id: respondent.org_id,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const roomName = `interview-${interview.id}`

  // Step 4: Create room + generate token
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  )
  await roomService.createRoom({ name: roomName, emptyTimeout: 300 })

  // Start Egress (fire-and-forget, D-23)
  try {
    const egressClient = new EgressClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    )
    await egressClient.startRoomCompositeEgress(roomName, {
      file: new EncodedFileOutput({
        filepath: `interviews/${interview.id}.mp4`,
        output: {
          case: 's3',
          value: new S3Upload({
            accessKey: process.env.SUPABASE_S3_ACCESS_KEY!,
            secret: process.env.SUPABASE_S3_SECRET_KEY!,
            bucket: 'recordings',
            endpoint: process.env.SUPABASE_S3_ENDPOINT!,
            region: process.env.SUPABASE_S3_REGION || 'us-east-1',
          }),
        },
      }),
    })
  } catch (e) {
    console.error('Egress start failed (non-blocking):', e)
  }

  // Generate participant token
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: respondent.id, name: respondent.name },
  )
  at.addGrant({ roomJoin: true, room: roomName })
  const livekitToken = await at.toJwt()

  return Response.json({
    token: livekitToken,
    roomName,
    interviewId: interview.id,
  })
}
```
[VERIFIED: LiveKit server SDK API from npm docs, Supabase admin pattern from codebase]

### Pattern 3: Agent State-Driven Orb (D-29, D-31)

**What:** Use `useAgent()` hook to detect agent state automatically, combined with `useTrackVolume()` for amplitude-reactive speaking effects.

**When to use:** The InterviewOrb component.

**Key finding:** The `useAgent()` hook (evolved from `useVoiceAssistant`) provides automatic state detection via the `lk.agent.state` participant attribute. States include: `connecting`, `listening`, `thinking`, `speaking`. This eliminates the need for D-31's custom data channel `{"type": "thinking"}` message -- the agent's state is published automatically by the LiveKit Agents framework.

**Example:**
```typescript
// Source: docs.livekit.io/frontends/build/agent-state/
import { useAgent } from '@livekit/components-react'
import { useTrackVolume } from '@livekit/components-react'

function InterviewOrb() {
  const { state, audioTrack } = useAgent()
  const volume = useTrackVolume(audioTrack)

  // Map agent state to orb visual state
  const orbState = mapAgentState(state)
  // 'idle' | 'listening' | 'thinking' | 'speaking'

  // For speaking state, use volume (0-1) to drive border-radius morphing
  const borderRadius = state === 'speaking'
    ? calculateBlobRadius(volume)
    : '50%'

  return (
    <div className={`orb orb-${orbState}`} style={{ borderRadius }}>
      {/* Orb visual */}
    </div>
  )
}
```
[VERIFIED: useAgent() API from docs.livekit.io/frontends/build/agent-state/]

### Pattern 4: Data Channel for Text Input + Phase Changes (D-03, D-32)

**What:** Use `useDataChannel` for two purposes: (1) sending text fallback input from frontend to agent, (2) receiving phase change notifications from agent to frontend.

**When to use:** TextFallbackInput sends text via `text-input` topic. PhaseIndicator receives updates via `phase-change` topic.

**Example (frontend send):**
```typescript
import { useDataChannel } from '@livekit/components-react'

function TextFallbackInput() {
  const { send } = useDataChannel('text-input')

  function handleSubmit(text: string) {
    send(new TextEncoder().encode(JSON.stringify({
      type: 'text_input',
      text,
    })), { reliable: true })
  }
  // ...
}
```

**Example (agent receive -- from prototype):**
```python
# Source: prototype entrevista_agent.py lines 281-296
@ctx.room.on("data_received")
def on_data(data_packet):
    payload = json.loads(data_packet.data.decode())
    if payload.get("type") == "text_input":
        text = payload.get("text", "").strip()
        if text:
            asyncio.create_task(session.generate_reply(user_input=text))
    elif payload.get("type") == "end_interview":
        asyncio.create_task(session.aclose())
```
[VERIFIED: prototype code + LiveKit useDataChannel docs]

### Anti-Patterns to Avoid

- **Hand-rolling WebRTC connections:** Use `LiveKitRoom` provider from `@livekit/components-react`. Never manage RTCPeerConnection directly.
- **Custom state detection via data channel when `useAgent()` handles it:** The `useAgent()` hook automatically tracks agent states. Only use data channels for application-specific messages (text input, phase changes, end interview).
- **Blocking on Egress failures:** Per D-23, Egress is supplementary. Never let recording failures prevent an interview from starting or continuing.
- **Synchronous Supabase writes in agent hot path:** The prototype correctly uses `asyncio.create_task()` for non-blocking persistence. Maintain this pattern.
- **Rebuilding from scratch instead of copying prototype:** The directive is "copy and evolve." The prototype's patterns for STT event handling, data channel, system prompt injection, and function tools are battle-tested.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebRTC connection management | Custom RTCPeerConnection + signaling | `@livekit/components-react` `LiveKitRoom` provider | ICE candidates, STUN/TURN, reconnection, track subscription are extremely complex |
| Agent state detection | Data channel messages for thinking/listening/speaking | `useAgent()` hook reads `lk.agent.state` automatically | Framework handles state transitions, no manual coordination needed |
| Voice activity detection | Custom audio analysis for speech detection | Silero VAD via `livekit-plugins-silero` | Pre-trained model with tunable parameters, handles multi-language |
| Audio recording | MediaRecorder API on client | LiveKit Egress (server-side composite recording) | Client-side recording misses agent audio, Egress captures full room |
| SSE streaming for Voxtral TTS | Build new streaming adapter | Copy `voxtral_tts.py` from prototype | Already handles SSE parsing, float32->int16 conversion, error recovery |
| Mic device selection UI | Custom getUserMedia + enumerateDevices | `useMediaDeviceSelect({ kind: 'audioinput' })` | Hook manages permissions, device enumeration, switching cleanly |
| Audio level visualization | Web Audio API AnalyserNode from scratch | `useTrackVolume()` for level meter, `useAgent()` for state | Hooks provide 0-1 float values at native refresh rate |

**Key insight:** LiveKit's React SDK abstracts nearly all WebRTC complexity. The value of this phase is in the UX layer (orb animation, lobby flow, transcript display) and the agent intelligence (system prompt engineering, function tools, time management) -- not in reinventing WebRTC plumbing.

## Common Pitfalls

### Pitfall 1: Microphone Permission Denied on Mobile Safari

**What goes wrong:** iOS Safari requires user gesture to access microphone. If `getUserMedia` is called without a user interaction, it silently fails or prompts at unexpected times.
**Why it happens:** Safari security model is stricter than Chrome. LiveKit's `LiveKitRoom` component handles this but the mic check in the lobby needs careful handling.
**How to avoid:** Request mic permission in the lobby screen on the "Comenzar entrevista" button click (user gesture). The `useMediaDeviceSelect` hook should be initialized only after the user explicitly interacts.
**Warning signs:** Mic level meter shows zero on iOS despite correct code on Chrome.
[ASSUMED -- based on known mobile WebRTC behavior]

### Pitfall 2: Race Condition in Token Route

**What goes wrong:** Two rapid clicks on "Comenzar" create two interview rows and two LiveKit rooms.
**Why it happens:** No server-side mutex on the 4-step flow in `/api/livekit/token`.
**How to avoid:** The check for existing active interview (step 2 in D-19) prevents this. Additionally, disable the button immediately on click (frontend debounce). Consider a Supabase unique constraint on `(respondent_id, status='active')` if paranoid.
**Warning signs:** Multiple interview rows for same respondent.

### Pitfall 3: Transcript Entry Duplication

**What goes wrong:** Both `on_user_turn_completed` and `conversation_item_added` fire for user messages, causing duplicate entries.
**Why it happens:** The prototype uses `on_user_turn_completed` for user speech and `conversation_item_added` for bot speech. But `conversation_item_added` fires for ALL messages.
**How to avoid:** In the `conversation_item_added` handler, only save entries where `role === 'assistant'`. The prototype already does this correctly (line 253: `if "assistant" in role.lower()`). Preserve this pattern.
**Warning signs:** Each user utterance appears twice in transcript.
[VERIFIED: prototype code, lines 182-196 and 246-261]

### Pitfall 4: Egress to Supabase S3 Endpoint Configuration

**What goes wrong:** LiveKit Egress can't write to Supabase Storage because the S3 endpoint format or credentials are wrong.
**Why it happens:** Supabase Storage S3 compatibility uses a specific endpoint format: `https://{project-id}.supabase.co/storage/v1/s3` and requires S3 access keys generated from the Supabase dashboard (not the service role key).
**How to avoid:** Generate dedicated S3 access keys from Supabase dashboard (Project Settings > Storage > S3 Connection). Create a `recordings` bucket. Use `force_path_style: true` in S3 config.
**Warning signs:** Egress starts but ends with error status. Check LiveKit Cloud egress logs.
[CITED: supabase.com/docs/guides/storage/s3/authentication]

### Pitfall 5: Agent Crash on Concurrent Sessions

**What goes wrong:** If one interview's agent crashes (e.g., unhandled exception in a function tool), it should not affect other concurrent sessions.
**Why it happens:** Python asyncio exception propagation can be tricky. Unhandled exceptions in `asyncio.create_task()` tasks silently disappear.
**How to avoid:** Wrap all `asyncio.create_task()` calls in try/except. The prototype's `_send_data` method already has error handling (line 215-218). Extend this pattern to all async tasks.
**Warning signs:** Silent data loss -- transcript entries or insights not saved but no error visible.
[VERIFIED: prototype code shows pattern]

### Pitfall 6: VoxtralTTS Streaming with Long Responses

**What goes wrong:** Voxtral TTS SSE streaming times out or drops audio for very long agent responses (30+ second monologues).
**Why it happens:** The `httpx.AsyncClient(timeout=30.0)` in the prototype may be too short for long responses. Also, the SSE connection might be interrupted by Railway's proxy.
**How to avoid:** Increase timeout to 60s. The agent's system prompt should enforce "keep responses to 2-3 sentences" (prototype already does this). Monitor TTS latency in production.
**Warning signs:** Agent speech cuts off mid-sentence.
[VERIFIED: prototype voxtral_tts.py line 107]

## Code Examples

### Database Migration (D-13)

```sql
-- 004_interviews.sql
-- Source: Schema design from CONTEXT.md D-13

CREATE TABLE entrevista.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES entrevista.campaigns(id) ON DELETE CASCADE NOT NULL,
  respondent_id UUID REFERENCES entrevista.respondents(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES entrevista.organizations(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  topics_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entrevista.transcript_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES entrevista.interviews(id) ON DELETE CASCADE NOT NULL,
  speaker TEXT NOT NULL CHECK (speaker IN ('bot', 'client')),
  content TEXT NOT NULL,
  elapsed_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for interviews (researcher dashboard access)
ALTER TABLE entrevista.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_can_view_interviews" ON entrevista.interviews
  FOR SELECT USING (org_id = entrevista.get_org_id());

-- Agent uses service_role key, bypasses RLS for insert/update
-- No insert/update policies needed for authenticated users

-- RLS for transcript_entries
ALTER TABLE entrevista.transcript_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_can_view_transcripts" ON entrevista.transcript_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM entrevista.interviews
      WHERE id = entrevista.transcript_entries.interview_id
      AND org_id = entrevista.get_org_id()
    )
  );

-- Indexes
CREATE INDEX idx_interviews_campaign ON entrevista.interviews(campaign_id);
CREATE INDEX idx_interviews_respondent ON entrevista.interviews(respondent_id);
CREATE INDEX idx_transcript_interview ON entrevista.transcript_entries(interview_id);

-- Updated_at trigger
CREATE TRIGGER interviews_updated_at
  BEFORE UPDATE ON entrevista.interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
[VERIFIED: follows schema patterns from existing 002_campaigns.sql + 003_move_to_entrevista_schema.sql]

### System Prompt Template (D-06)

```python
# Source: Evolved from prototype interview_config.py
SYSTEM_PROMPT_TEMPLATE = """Eres un entrevistador profesional de investigacion llamado "{persona_name}".
Tu trabajo es conducir una entrevista de investigacion con un participante para recopilar insights valiosos.

## Personalidad
{style_instructions}

## Objetivos de la investigacion
{research_goals}

## Datos que necesitas recopilar
{data_points}

## Contexto del estudio
{study_context}

## Tono y enfoque
{tone_instructions}

## Reglas de la entrevista
- Duracion objetivo: {duration_target} minutos
- NUNCA hagas mas de una pregunta a la vez
- Manten tus respuestas breves (2-3 oraciones maximo antes de preguntar)
- Usa las funciones disponibles para registrar hallazgos en tiempo real
- Si el participante divaga, redirige suavemente
- Si da respuestas cortas, ofrece ejemplos para inspirar

## Fases de la entrevista
### Calentamiento (15% del tiempo)
Saluda, presenta el proposito, pon comodo al participante.

### Conversacion (70% del tiempo)
Explora los temas de investigacion en profundidad. Usa follow-ups adaptativos.

### Cierre (15% del tiempo)
Resume hallazgos, pregunta si algo falto, agradece.

## Idioma
- Todo en espanol mexicano
- NUNCA cambies a ingles
- Si el participante menciona terminos tecnicos en ingles, usalos naturalmente

## Estado actual de la entrevista
{state_context}
"""
```
[ASSUMED -- evolved from prototype, specific template structure is Claude's discretion]

### Orb CSS Animations (D-29, D-30)

```css
/* Idle pulse */
@keyframes orb-pulse {
  0%, 100% { transform: scale(1.0); }
  50% { transform: scale(1.03); }
}

/* Listening breathe */
@keyframes orb-breathe {
  0%, 100% { transform: scale(1.0); }
  50% { transform: scale(1.05); }
}

/* Listening ripple */
@keyframes orb-ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}

/* Thinking shimmer (rotating radial gradient) */
@keyframes orb-shimmer {
  0% { background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.8), transparent 70%); }
  25% { background: radial-gradient(circle at 70% 30%, rgba(99,102,241,0.8), transparent 70%); }
  50% { background: radial-gradient(circle at 70% 70%, rgba(99,102,241,0.8), transparent 70%); }
  75% { background: radial-gradient(circle at 30% 70%, rgba(99,102,241,0.8), transparent 70%); }
  100% { background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.8), transparent 70%); }
}

.orb {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: hsl(239 84% 67%);
  transition: transform 300ms ease-out, box-shadow 300ms ease-out,
              border-radius 50ms linear, opacity 300ms ease-out;
}

.orb-idle {
  animation: orb-pulse 2s ease-in-out infinite;
  box-shadow: 0 0 40px rgba(99,102,241,0.3);
}

.orb-listening {
  animation: orb-breathe 3s ease-in-out infinite;
  box-shadow: 0 0 60px rgba(99,102,241,0.5);
}

.orb-thinking {
  transform: scale(0.95);
  opacity: 0.85;
  animation: orb-shimmer 400ms linear infinite;
  box-shadow: 0 0 30px rgba(99,102,241,0.2);
}

.orb-speaking {
  box-shadow: 0 0 80px rgba(99,102,241,0.6);
  /* border-radius driven by JS via useTrackVolume() */
}

@media (max-width: 767px) {
  .orb { width: 96px; height: 96px; }
}
```
[ASSUMED -- based on UI-SPEC specifications, exact keyframes are Claude's discretion]

### Generic Function Tools (D-08)

```python
# Source: Evolved from prototype's domain-specific tools
@function_tool()
async def note_theme(
    self, ctx: RunContext,
    theme: str,
    description: str,
    supporting_quote: str,
) -> str:
    """Registra un tema o patron que emerge de la conversacion."""
    data = {"theme": theme, "description": description, "quote": supporting_quote}
    await save_insight(self._interview_id, "theme", data)
    self._state.topics_count += 1
    return f"Tema registrado: {theme}"

@function_tool()
async def note_quote(
    self, ctx: RunContext,
    quote: str,
    context: str,
    sentiment: str,
) -> str:
    """Registra una cita textual relevante del participante."""
    data = {"quote": quote, "context": context, "sentiment": sentiment}
    await save_insight(self._interview_id, "quote", data)
    return f"Cita registrada."

@function_tool()
async def note_sentiment(
    self, ctx: RunContext,
    topic: str,
    sentiment: str,
    intensity: str,
) -> str:
    """Registra el sentimiento del participante sobre un tema especifico."""
    data = {"topic": topic, "sentiment": sentiment, "intensity": intensity}
    await save_insight(self._interview_id, "sentiment", data)
    return f"Sentimiento registrado para: {topic}"

@function_tool()
async def transition_phase(
    self, ctx: RunContext,
    next_phase: str,
) -> str:
    """Cambia a la siguiente fase: warmup, conversation, o closing."""
    self._state.transition_to(next_phase)
    self._update_instructions()
    self._send_data({"type": "phase_change", "phase": next_phase})
    return f"Transicion a fase: {next_phase}"

@function_tool()
async def end_interview(
    self, ctx: RunContext,
    summary: str,
) -> str:
    """Termina la entrevista. Llama despues de dar el resumen final."""
    self._state.ended = True
    duration = int(time.time() - self._start_time)
    await update_interview_status(
        self._interview_id, "completed",
        ended_at=datetime.now(timezone.utc).isoformat(),
        duration_seconds=duration,
        topics_count=self._state.topics_count,
    )
    self._send_data({"type": "interview_ended",
                     "duration": duration,
                     "topics_count": self._state.topics_count})
    return f"Entrevista finalizada."
```
[ASSUMED -- tool parameter schemas are Claude's discretion per CONTEXT.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useVoiceAssistant()` | `useAgent()` | Late 2025 / early 2026 | `useAgent()` adds pre-connect buffering, failure reasons, cleaner state machine. Both still available. |
| Custom data channel for agent thinking state | Automatic via `lk.agent.state` participant attribute | LiveKit Agents >= 0.9.0 | No need for manual `{"type": "thinking"}` data channel messages. useAgent() reads state automatically. |
| `AudioVisualizer` component | `BarVisualizer` component | 2025 | AudioVisualizer deprecated. BarVisualizer supports AgentState-aware animations. Custom orb still preferred per user decision. |
| Custom VoxtralTTS adapter | Still custom (no official plugin yet) | N/A | GitHub issue #5247 (2026-03-27) requests integration. Custom adapter from prototype remains necessary. |
| `livekit-agents` 0.x | `livekit-agents` 1.5.1 | 2025 | Major API change: `VoicePipelineAgent` -> `Agent` class, `@function_tool()` decorator, `AgentSession` pattern. Prototype already uses 1.x API. |

**Deprecated/outdated:**
- `AudioVisualizer`: Deprecated in favor of `BarVisualizer`. Not relevant since we use custom orb.
- `VoicePipelineAgent`: Replaced by `Agent` class in livekit-agents 1.x. Prototype already uses `Agent`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Realtime polling every 2-3s is sufficient for transcript display (vs. subscriptions) | Alternatives Considered | If respondent expects instant transcript, may need Supabase Realtime subscriptions. LOW risk -- agent writes entries frequently. |
| A2 | Mobile Safari mic permission works with LiveKit's `useMediaDeviceSelect` after user gesture | Pitfalls | If mic fails on iOS, need special handling. MEDIUM risk -- test on real iOS device. |
| A3 | Single Railway container with 1GB RAM handles 5 concurrent sessions (I/O bound) | Architecture | If sessions are more CPU-intensive than expected, may need more RAM. LOW risk -- prototype confirms I/O-bound pattern. |
| A4 | `useAgent()` hook is available in `@livekit/components-react` 2.9.20 | Architecture Patterns | If hook doesn't exist in this version, fall back to `useVoiceAssistant()`. LOW risk -- documented on livekit.io. |
| A5 | System prompt template with 4 brief sections is sufficient for all interviewer styles | Code Examples | If styles need radically different prompt structures, template may not be flexible enough. LOW risk -- prototype validates the template approach. |

## Open Questions

1. **Transcript Display: Polling vs. Supabase Realtime**
   - What we know: Agent writes transcript entries to Supabase in real-time. Frontend needs to display them.
   - What's unclear: Whether to use Supabase Realtime subscriptions or polling from the frontend.
   - Recommendation: Use LiveKit data channel to push transcript entries to frontend in real-time (agent already has the data). Save to Supabase in parallel for persistence. This avoids both polling and Realtime subscription complexity. The agent can send `{"type": "transcript", "speaker": "bot", "text": "..."}` via data channel.

2. **ElevenLabs Voice IDs for Personas**
   - What we know: 4 voice personas defined in `campaign.ts` (voxtral-natalia, voxtral-diego, elevenlabs-sofia, elevenlabs-marco).
   - What's unclear: Actual ElevenLabs voice IDs for Sofia and Marco (Mexican Spanish accent voices).
   - Recommendation: Look up available ElevenLabs voices with Mexican accent during implementation. Map persona IDs to actual provider voice IDs in a config module.

3. **Voxtral Voice IDs for Personas**
   - What we know: Prototype uses a cloned voice ID (`0c1cb9a3-...`). The SaaS needs two distinct Voxtral voices (Natalia, Diego).
   - What's unclear: Whether these are pre-existing Voxtral voices or need to be created via voice cloning.
   - Recommendation: Use Voxtral's built-in Spanish voices if available, or clone two voices using 3-second reference audio (supported per Voxtral docs). Map voice IDs in config.

4. **Supabase Storage Bucket for Recordings**
   - What we know: Egress outputs to S3-compatible Supabase Storage.
   - What's unclear: Whether the `recordings` bucket needs to be created manually or can be created via migration.
   - Recommendation: Create bucket manually in Supabase dashboard or via Supabase Management API. Add S3 access keys to environment variables.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend | Yes | (in project) | -- |
| Python 3.11+ | Agent | Needs verification on Railway | -- | Railway supports Python natively |
| LiveKit Cloud | WebRTC SFU + Egress | External service | -- | No fallback (core dependency) |
| Supabase Cloud | DB + Storage + Auth | External service | -- | No fallback (core dependency) |
| Railway | Agent hosting | External service | -- | No fallback (core dependency) |
| Deepgram API | STT | External service | -- | No fallback for Spanish STT |
| Anthropic API (Claude) | LLM | External service | -- | No fallback |
| Mistral API | Voxtral TTS | External service | -- | ElevenLabs as fallback TTS |
| ElevenLabs API | Premium TTS | External service | -- | Voxtral as fallback TTS |

**Missing dependencies with no fallback:**
- LiveKit Cloud account must be configured with API keys
- Supabase Storage S3 access keys must be generated
- All API keys (Deepgram, Anthropic, Mistral, ElevenLabs) must be provisioned

**Missing dependencies with fallback:**
- If Mistral API is down, ElevenLabs serves as TTS fallback (and vice versa)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEBR-01 | Token route creates interview + returns LiveKit token | unit | `npx vitest run tests/api/livekit-token.test.ts -t "creates interview"` | No -- Wave 0 |
| WEBR-01 | Token route rejects invalid/used tokens | unit | `npx vitest run tests/api/livekit-token.test.ts -t "rejects"` | No -- Wave 0 |
| WEBR-05 | Transcript feed renders entries with speaker labels | unit | `npx vitest run tests/components/transcript-feed.test.tsx` | No -- Wave 0 |
| WEBR-07 | Text input sends data channel message | unit | `npx vitest run tests/components/text-fallback-input.test.tsx` | No -- Wave 0 |
| WEBR-08 | Time management guardrails fire at 80% and 95% | unit | `npx vitest run tests/agent/interview-state.test.ts` | No -- Wave 0 |
| DASH-05 | Interview room renders orb, transcript, timer, controls | unit | `npx vitest run tests/components/interview-room.test.tsx` | No -- Wave 0 |
| WEBR-02/03/04 | Agent conducts interview with follow-ups | manual-only | Manual: join interview room and talk | -- |
| WEBR-06 | Egress records audio to Supabase Storage | manual-only | Manual: verify recording in Supabase dashboard | -- |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/livekit-token.test.ts` -- covers WEBR-01 token route logic (mock Supabase + LiveKit SDK)
- [ ] `tests/components/transcript-feed.test.tsx` -- covers WEBR-05
- [ ] `tests/components/text-fallback-input.test.tsx` -- covers WEBR-07
- [ ] `tests/components/interview-room.test.tsx` -- covers DASH-05
- [ ] Agent-side tests are Python (pytest) -- separate test infrastructure needed in `agent/` directory

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (partial) | Supabase Auth for researcher dashboard. Interview pages use token-based access (invite_token), no user auth. |
| V3 Session Management | Yes | LiveKit tokens have TTL (default 6h). Interview sessions bounded by duration target. |
| V4 Access Control | Yes | RLS with `entrevista.get_org_id()` for researcher-facing data. Agent uses service_role key (bypasses RLS). Invite tokens are unguessable UUIDs. |
| V5 Input Validation | Yes | zod validation on API route inputs. Agent-side validation on data channel messages (JSON parse in try/catch). |
| V6 Cryptography | No | No custom crypto. LiveKit handles DTLS-SRTP for WebRTC. Supabase handles at-rest encryption. |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token enumeration (guessing invite tokens) | Information Disclosure | UUIDs are 128-bit random. Rate limiting on `/api/livekit/token` route. |
| Duplicate interview creation (replay) | Tampering | D-19 step 3: check no active interview exists. Frontend debounce. |
| Data channel injection (malicious text input) | Tampering | Agent parses JSON in try/catch. `session.generate_reply()` sanitizes input via LLM. |
| Unauthorized transcript access | Information Disclosure | RLS on transcript_entries via org_id check. Service role only for agent writes. |
| LiveKit API key exposure | Information Disclosure | Keys stored in env vars. Token generation server-side only (API route). Never exposed to client. |
| Recording access | Information Disclosure | Supabase Storage bucket should be private. Signed URLs for researcher playback. |

## Sources

### Primary (HIGH confidence)
- [npm registry] -- `@livekit/components-react` 2.9.20, `livekit-client` 2.18.1, `livekit-server-sdk` 2.15.0
- [PyPI] -- `livekit-agents` 1.5.1, `livekit-plugins-deepgram` 1.5.1, `livekit-plugins-anthropic` 1.5.1, `livekit-plugins-silero` 1.5.1, `livekit-plugins-elevenlabs` 1.5.1, `livekit-plugins-mistralai` 1.5.1
- [Prototype code] -- `consultoria_ale/agent/` -- entrevista_agent.py, voxtral_tts.py, interview_config.py, interview_state.py, supabase_client.py
- [Existing codebase] -- package.json, vitest.config.ts, supabase migrations, interview consent flow, respondents-tab.tsx, admin.ts
- [docs.livekit.io/frontends/build/agent-state/](https://docs.livekit.io/frontends/build/agent-state/) -- useAgent() hook, AgentState values, state detection
- [docs.livekit.io/reference/components/react/hook/usetrackvolume/](https://docs.livekit.io/reference/components/react/hook/usetrackvolume/) -- useTrackVolume hook API
- [docs.livekit.io/reference/components/react/hook/useisspeaking/](https://docs.livekit.io/reference/components/react/hook/useisspeaking/) -- useIsSpeaking hook API
- [docs.livekit.io/reference/components/react/hook/usedatachannel/](https://docs.livekit.io/reference/components/react/hook/usedatachannel/) -- useDataChannel hook API

### Secondary (MEDIUM confidence)
- [docs.livekit.io/home/egress/room-composite/](https://docs.livekit.io/home/egress/room-composite/) -- Room Composite Egress documentation
- [supabase.com/docs/guides/storage/s3/authentication](https://supabase.com/docs/guides/storage/s3/authentication) -- Supabase S3 access key configuration
- [docs.livekit.io/home/server/generating-tokens/](https://docs.livekit.io/home/server/generating-tokens/) -- AccessToken generation
- [github.com/livekit/agents/issues/5247](https://github.com/livekit/agents/issues/5247) -- Voxtral TTS integration request (confirms no official plugin)

### Tertiary (LOW confidence)
- None -- all claims verified or cited

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm/PyPI, prototype proves the stack works
- Architecture: HIGH -- prototype provides proven patterns, LiveKit SDK APIs verified via official docs
- Pitfalls: MEDIUM -- some based on general WebRTC/mobile experience rather than project-specific testing
- Frontend hooks: HIGH -- all LiveKit React hooks verified via official documentation
- Egress to Supabase S3: MEDIUM -- documented but not tested in this specific configuration

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack, LiveKit minor releases unlikely to break patterns)
