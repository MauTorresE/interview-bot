# EntrevistaAI — Current Interview System Documentation

**Status:** Authoritative snapshot of the working system as of commit `6cca276`, written before the Tier 0 + Tier 1 execution push.

**Purpose:** Capture the exact current behavior of every component in the voice interview flow so we can reason about risk during the upcoming refactor. If a proposed change contradicts something in this document, stop and re-check.

**Scope:** End-to-end respondent journey — consent → lobby → interview → completion — plus the Python agent, Supabase persistence, LiveKit integration, and all data channel messages.

---

## 1. Architecture Overview

EntrevistaAI is a **multi-tenant voice interview SaaS** split across four deployment targets:

```
┌───────────────────────┐        ┌──────────────────────────┐
│  Next.js (Vercel)     │        │  Python Agent (Railway)  │
│  - Consent/Lobby UI   │        │  - LiveKit worker        │
│  - Interview Room UI  │        │  - STT/LLM/TTS pipeline  │
│  - API routes         │        │  - Timing guardrails     │
│  - Dashboard          │        │  - Transcript saving     │
└──────────┬────────────┘        └────────────┬─────────────┘
           │                                  │
           │ wss (WebRTC signalling)          │ wss (as participant)
           │                                  │
           └──────────────┬───────────────────┘
                          │
               ┌──────────▼──────────┐
               │  LiveKit Cloud SFU  │
               │  (WebRTC + rooms)   │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │  Supabase           │
               │  - entrevista schema│
               │  - RLS + service key│
               │  - Storage (audio)  │
               └─────────────────────┘
```

**Key provider calls from the Python agent:**
- **Deepgram Nova-3** (es-419) for streaming STT
- **Anthropic Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) via `livekit-plugins-anthropic` with `caching="ephemeral"` and `_strict_tool_schema=False`
- **Voxtral TTS** (`voxtral-mini-tts-2603`) via custom `VoxtralTTS` adapter with cloned Mexican Spanish voice `0c1cb9a3-5b28-4918-8e5f-99a268c334e3`
- **ElevenLabs TTS** (`eleven_turbo_v2_5`) as alternative persona backend via `livekit-plugins-elevenlabs`
- **Silero VAD** with `min_speech_duration=0.3s`, `min_silence_duration=1.5s` (tuned for Spanish thinking pauses), `prefix_padding_duration=0.3s`

**Current LLM cost per interview:** ~$0.12 at Haiku 4.5 with ephemeral caching. Was ~$0.95 at Sonnet 4 before optimization.

---

## 2. Full Respondent Journey (Happy Path)

```
1. User clicks invite link (unique or reusable)
   ↓
2. page.tsx (server component) runs lookupToken():
   - Tries respondents table by invite_token (direct link)
   - Falls back to campaigns table by reusable_invite_token (reusable link)
   - Returns { valid, type, respondentId, campaignName, status, campaignStatus, activeInterviewId }
   ↓
3. page.tsx branches on respondent.status:
   - 'completed' → renders inline "Entrevista completada" thank-you card (TERMINAL STATE)
   - 'dropped' → renders "Sesion finalizada" card (TERMINAL STATE)
   - campaign 'archived' → renders "Enlace no valido" card (TERMINAL STATE)
   - otherwise → renders <InterviewFlowWrapper>
   ↓
4. <InterviewFlowWrapper> mounts with FlowPhase state machine:
   - Initial phase = 'rejoining' if activeInterviewId exists, else 'loading'
   - On mount: checks sessionStorage for saved session → 'rejoining' OR 'consent'
   ↓
5. 'consent' phase → <ConsentForm>
   - Direct link: 3 consent checkboxes, submit → recordConsent(token)
   - Reusable link: name input + 3 checkboxes, submit → recordConsentForReusableLink(token, name)
   - On success: POST /api/livekit/token → receives { token, wsUrl, interviewId, campaignInfo }
   - Calls onInterviewReady(data) → transitions to 'lobby'
   ↓
6. 'lobby' phase → <LobbyScreen>
   - Native getUserMedia + Web Audio API for mic check (NOT LiveKit)
   - Device picker (mic selection)
   - Mic level meter (Web Audio RMS)
   - Latch: micEverDetected.current = true when volume > 0.02
   - User clicks "Comenzar entrevista" → cleanup audio contexts → 1000ms delay → onStart() → phase='interview'
   ↓
7. 'interview' phase → <InterviewRoom> → <LiveKitRoom>
   - Establishes WebRTC connection
   - <RoomAudioRenderer> for agent audio output
   - <InterviewRoomContent> renders orb + transcript + controls
   - Python agent is dispatched by LiveKit Cloud when participant joins
   - Agent reads interview_id from room name (`interview-${uuid}`) and loads config from Supabase
   ↓
8. Python agent on_enter():
   - session.say(greeting) — speaks a personalized hello
   - update_interview_status(id, 'active', started_at)
   - asyncio.create_task(self._timing_loop()) — background guardrail checker
   ↓
9. Conversation proceeds:
   - Deepgram transcribes user speech → RoomEvent.TranscriptionReceived fires on frontend
   - on_user_turn_completed() saves transcript entry to Supabase + triggers timing check
   - Claude generates response → TTS speaks it via Voxtral/ElevenLabs
   - Bot transcript saved via conversation_item_added session event listener
   - Guardrails fire at 80% / 90% / 100% / 110% / 120% elapsed time
   ↓
10. Interview ends via ONE of these paths (all current, all fragile):
    a) LLM calls end_interview() tool naturally after giving summary
    b) 100% force-close via _check_timing_guardrails → transitions to 'closing' phase
    c) 110% hard stop → canned goodbye + _delayed_close(8s)
    d) 120% absolute kill → silent session.aclose()
    e) User clicks "Terminar entrevista" → sends data msg → 3s local force-end
    f) Connection drops → handleInterviewEnd fallback if elapsed > 2 min
   ↓
11. 'completion' phase renders a minimal thank-you card:
    - Campaign name, duration, topics count, "Gracias por tu tiempo"
    - sessionStorage cleared
```

**The four observed bugs in Phase 3 Plan 4 testing** (what Tier 0 is fixing):
1. Agent ignores guardrails past 100% — still asks new questions at 133%
2. 110% canned goodbye cut off mid-sentence (12s TTS, 8s delayed close)
3. No completion card shown after abrupt cut
4. Transcript delayed (my earlier anti-dup fix skipped non-final segments)

---

## 3. File Map (Every File in the Interview Flow)

### Backend / Agent (`agent/`)

| File | Purpose | Touched by Tier 0/1? |
|------|---------|----------------------|
| `entrevista_agent.py` | Main LiveKit agent — Agent class, session config, function tools, timing guardrails, data channel, entrypoint | **HEAVY rewrite** in Wave 1 + Wave 2/3 additions |
| `interview_state.py` | InterviewState class — phase, timing, topic count, tier properties | **Rewrite tier properties** in Wave 1.1 |
| `interview_prompts.py` | SYSTEM_PROMPT_TEMPLATE, STYLE_INSTRUCTIONS, PHASE_COACHING, build_system_prompt() | Minor text updates in Wave 1 |
| `supabase_client.py` | InterviewConfig dataclass, load_interview_config, save_transcript_entry, save_insight (stub), update_interview_status | **New function** save_interview_closing() in Wave 1.7 |
| `voxtral_tts.py` | Custom SSE streaming TTS adapter for Mistral Voxtral API | Not touched |
| `requirements.txt` | Python dependencies | Not touched |
| `Dockerfile` | Railway deployment image | Not touched |
| `pytest.ini` + `tests/` | Test scaffolding | Tests may be added |

### Frontend — Interview Flow (`src/app/interview/[token]/`)

| File | Purpose | Touched by Tier 0/1? |
|------|---------|----------------------|
| `page.tsx` | Server component — token lookup, terminal state branches, renders InterviewFlowWrapper | Wave 2.4 adds already_completed branch |
| `actions.ts` | Server actions — validateToken, recordConsent, recordConsentForReusableLink | Not touched |
| `consent-form.tsx` | Consent UI with checkboxes + name input (for reusable), calls POST /api/livekit/token | Not touched |
| `lobby-screen.tsx` | Mic check via native Web Audio API, device picker, level meter | Not touched (Wave 4.2 adds helpers separately) |
| `interview-flow-wrapper.tsx` | FlowPhase state machine (loading/consent/lobby/interview/completion/rejoining) | **HEAVY changes** Waves 2.3, 2.4, 4.1 |
| `interview-room.tsx` | LiveKitRoom wrapper, transcript listener, data channel, controls, end button | **HEAVY rewrite** Waves 1.4/1.5/1.6, 2.1/2.3, 3.1/3.2/3.3 |

### Frontend — Components (`src/components/interview/`)

| File | Purpose | Touched? |
|------|---------|----------|
| `interview-orb.tsx` | Morphing violet orb driven by agent state + volume | Not touched |
| `transcript-feed.tsx` | TranscriptEntry list display with auto-scroll | Wave 1.6 adds liveInterim prop |
| `text-fallback-input.tsx` | Text input for text-fallback mode | Not touched in this session |
| `interview-timer.tsx` | Elapsed/target time display | Not touched |
| `phase-indicator.tsx` | Current phase label (warmup/conversation/closing) | Not touched |
| `mic-level-meter.tsx` | Visual volume bar used in lobby | Not touched |

### Frontend — Routes (`src/app/api/`)

| File | Purpose | Touched? |
|------|---------|----------|
| `api/livekit/token/route.ts` | Creates interview row + LiveKit room + Egress + token; handles rejoin | **Wave 2.4** early branch for already_completed |
| `api/livekit/transcript/route.ts` | Loads transcript entries for a given interviewId (GET) | Not touched |
| (new in Wave 3.1) `api/interviews/[id]/confirm-end/route.ts` | **NEW** — REST fallback for user_confirmed_end | Wave 3.1 |

### Database (`supabase/migrations/`)

| File | Purpose | Touched? |
|------|---------|----------|
| `001_foundation.sql` | Organizations, memberships, base RLS | Not touched |
| `002_campaigns.sql` | Campaigns + research_briefs + respondents | Not touched |
| `003_move_to_entrevista_schema.sql` | Namespace move to `entrevista` schema | Not touched |
| `004_interviews.sql` | `interviews` + `transcript_entries` tables + RLS | Base schema — extended by new migration |
| `005_allow_5min_duration.sql` | Allow 5-min campaign duration | Already applied |
| (new) `006_closing_summary.sql` | **NEW** — add `closing_summary`, `closing_reason` columns | Wave 1.7 |

---

## 4. Python Agent — Deep Dive

### 4.1 Entrypoint flow (`entrepoint()` in `entrevista_agent.py`)

```python
async def entrypoint(ctx: JobContext):
    1. await ctx.connect(auto_subscribe=AUDIO_ONLY)
    2. participant = await ctx.wait_for_participant()
    3. interview_id = room_name.replace("interview-", "")
    4. config = await load_interview_config(interview_id)
    5. state = InterviewState(config.duration_target_seconds)
    6. system_prompt = build_system_prompt(brief, style, duration, state_context, phase)
    7. tts = VoxtralTTS(...) OR elevenlabs.TTS(...)
    8. agent = EntrevistaAgent(instructions=system_prompt, interview_id, config, state)
    9. session = AgentSession(stt, llm, tts, vad, allow_interruptions, ...)
   10. Register event handlers BEFORE session.start():
       - session.on("conversation_item_added") → save bot transcripts
       - session.on("close") → on_close handler
   11. await session.start(agent=agent, room=ctx.room)
   12. ctx.room.on("data_received") → on_data handler (text_input, end_interview)
```

**Critical ordering:** Event handlers MUST be registered BEFORE `session.start()` in LiveKit Agents 1.5.2 — handlers registered after silently lose events. Documented anti-pattern in `.continue-here.md`.

### 4.2 `EntrevistaAgent` class (subclass of `Agent`)

**Constructor params:** `instructions`, `interview_id`, `config`, `state`.

**`super().__init__(instructions=..., use_tts_aligned_transcript=False)`** — we explicitly disable TTS-aligned transcripts so text streams immediately without waiting for audio alignment.

**Lifecycle methods:**
- `on_enter()` — speaks greeting via `session.say(greeting)`, updates interview status to 'active', starts `_timing_loop()` as `asyncio.create_task` (fire-and-forget).
- `on_user_turn_completed(turn_ctx, new_message)` — **override of Agent class method** (NOT a session event). Saves user transcript, triggers timing guardrail check.

**Function tools:**
- `note_theme(theme, description, supporting_quote)` — increments topics_count, saves insight (stub)
- `note_quote(quote, context, sentiment)` — saves quote insight (stub)
- `note_sentiment(topic, sentiment, intensity)` — saves sentiment insight (stub)
- `transition_phase(next_phase)` — updates state.phase, sends phase_change data message, calls _update_instructions()
- `extend_interview()` — adds 50% more time to the session (currently in plan to remove)
- `end_interview(summary)` — sets state.ended=True, updates DB to 'completed', sends `interview_ended` data message, returns confirmation

**Internal methods:**
- `_timing_loop()` — `while not self._state.ended: await asyncio.sleep(10); _check_timing_guardrails()`. **Currently has no try/except and no done_callback — silent death is a known bug.**
- `_check_timing_guardrails()` — elif chain: 120% (absolute kill) → 110% (canned goodbye + _delayed_close 8s) → 100% (force close + _update_instructions) → 90% (extension offer + _update_instructions) → 80% (nudge + _update_instructions)
- `_update_instructions()` — calls `build_system_prompt(...)` then `self.update_instructions(updated)`. **Known issue: mid-session updates are unreliable due to prompt caching.**
- `_send_data(data: dict)` — JSON-encodes and publishes to LiveKit data channel with null-safety check on `session.room`. Retries once on failure.
- `_on_conversation_item_added(event)` — saves bot transcript to Supabase, sends via data channel as `type: "transcript"` (NOTE: frontend currently ignores this path, relying on `RoomEvent.TranscriptionReceived`).

### 4.3 AgentSession configuration

```python
session = AgentSession(
    stt=deepgram.STT(model="nova-3", language="es-419"),
    llm=anthropic.LLM(
        model=os.environ.get("LLM_MODEL", "claude-haiku-4-5-20251001"),
        caching="ephemeral",
        _strict_tool_schema=False,
    ),
    tts=tts,  # VoxtralTTS OR elevenlabs.TTS
    vad=silero.VAD.load(
        min_speech_duration=0.3,
        min_silence_duration=1.5,
        prefix_padding_duration=0.3,
    ),
    allow_interruptions=True,
    false_interruption_timeout=2.0,
    resume_false_interruption=True,
    user_away_timeout=12.0,
)
```

**Registered events (before session.start):**
- `session.on("conversation_item_added")` — saves bot transcripts with dedupe by item.id
- `session.on("close")` — on_close: if `agent._state.ended`, log complete; else log disconnect and **keep interview as 'active'** so rejoin is possible within emptyTimeout (300s)

**Registered after session.start:**
- `ctx.room.on("data_received")` — parses JSON payload; handles `text_input` (calls `session.generate_reply(user_input=text)`) and `end_interview` (calls `session.aclose()`)

### 4.4 `InterviewState` class

**Fields** (current, from committed state):
- `phase: str` — one of "warmup", "conversation", "closing"
- `started_at: float` — `time.time()` at construction
- `duration_target_seconds: int`
- `topics_count: int`
- `ended: bool`
- `_nudged: bool` — 80% nudge fired
- `_extension_offered: bool` — 90% extension offered
- `_extended: bool` — extension accepted
- `_close_forced: bool` — 100% force-close fired

**Properties:**
- `elapsed_seconds`, `elapsed_fraction`
- `time_context` — dynamic string injected into system prompt EVERY turn (see section 4.5)
- `should_nudge` — `>= 0.80 and not _nudged`
- `should_offer_extension` — `>= 0.90 and not _extension_offered and not _extended`
- `should_force_close` — `>= 1.00 and not _close_forced`
- `should_hard_stop` — `>= 1.10` (no idempotency — fires every check)
- `should_absolute_kill` — `>= 1.20`

**Methods:**
- `extend(extra_seconds)` — adds up to 50% of target, sets `_extended=True`, resets `_close_forced`
- `mark_extension_offered()`, `mark_close_forced()`, `mark_nudged()` — idempotency flags
- `transition_to(phase)` — validates against VALID_PHASES

### 4.5 `time_context` injection

Every time `_update_instructions()` runs, `state.time_context` is rebuilt and injected into the system prompt. Current content:

```
Llevas {elapsed} de {target} minutos.
Fase: {phase}.
Tiempo restante: {remaining} minutos.
Temas documentados: {topics_count}.

[Topic pacing guidance — conditional on topics_count vs ideal_topics]

[Time urgency — conditional on elapsed_fraction]
- >= 1.0: "URGENTE: EL TIEMPO HA TERMINADO. Cierra la llamada AHORA. ... Usa la funcion end_interview cuando termines."
- >= 0.90 and not _extended: "IMPORTANTE: Queda menos de 1 minuto. En tu proxima respuesta, pregunta naturalmente si quieren extender..."
- >= 0.90 and _extended: "IMPORTANTE: La llamada ya fue extendida y queda menos de 1 minuto. Empieza a cerrar..."
- >= 0.80: "NOTA: Comienza a cerrar el tema actual y prepara el cierre."
```

**Known issue:** These string injections are part of the system prompt, which is cached by Anthropic ephemeral caching. When `update_instructions()` is called mid-session, the prompt cache may not invalidate correctly, so the LLM continues responding based on the OLD cached prompt for several turns. This is the root cause of the "agent ignores 100% force-close" bug.

### 4.6 `supabase_client.py` functions

- `get_supabase_client()` — singleton
- `_table(name)` — accesses the `entrevista` schema via `client.schema("entrevista").table(name)`. **Do NOT use `ClientOptions(schema=...)` — it's broken in the Python client.**
- `_fix_encoding(text)` — fixes double-encoded UTF-8 from STT outputs
- `load_interview_config(interview_id)` — joins `interviews → campaigns → research_briefs → respondents`; returns `InterviewConfig` with fallback defaults if anything fails
- `save_transcript_entry(interview_id, speaker, content, elapsed_ms)` — inserts to `entrevista.transcript_entries`
- `save_insight(interview_id, insight_type, data)` — **STUB** — logs but doesn't persist (Phase 4 scope)
- `update_interview_status(interview_id, status, **kwargs)` — updates the interview row

**Key brief field mapping** (load_interview_config):
- DB has `research_goals / critical_data_points / context_background / tone_approach`
- Agent expects `goals / data_points / context / tone`
- Fallback chain handles both key formats

---

## 5. Frontend — Deep Dive

### 5.1 `InterviewFlowWrapper` state machine

**FlowPhase enum:** `'loading' | 'consent' | 'lobby' | 'interview' | 'completion' | 'rejoining'`

**Initial state:**
- If `activeInterviewId` passed from server → `'rejoining'`
- Else → `'loading'`

**Loading → Consent/Rejoining logic (useEffect on mount):**
```typescript
if (activeInterviewId) setPhase('rejoining')
else if (sessionStorage has saved session) setPhase('rejoining')
else setPhase('consent')
```

**Rejoining effect:** Calls `/api/livekit/token` with `rejoin: true` and `respondentId`. On success → 'interview'. On failure → clears sessionStorage → 'consent'.

**Consent flow:** `<ConsentForm>` calls `onInterviewReady(data)` → saves to sessionStorage → `setPhase('lobby')`.

**Lobby flow:** `<LobbyScreen>` calls `onStart()` → `setTimeout(() => setPhase('interview'), 1000)` to let the browser release mic before LiveKit grabs it.

**Interview flow:** `<InterviewRoom>` calls `onInterviewEnd({duration, topicsCount})` → clears sessionStorage → saves `completionData` → `setPhase('completion')`.

**Completion render:** Inline JSX card with campaign name, duration, topics count, "Gracias por tu tiempo" — no separate component.

### 5.2 `InterviewRoom` component

**Structure:**
```tsx
<LiveKitRoom serverUrl wsUrl token audio={true}>
  <RoomAudioRenderer />
  <InterviewRoomContent session onInterviewEnd />
</LiveKitRoom>
```

**InterviewRoomContent state:**
- `phase: ConversationPhase` — 'warmup' | 'conversation' | 'closing' (synced from backend via data channel)
- `entries: TranscriptEntry[]` — committed transcript lines
- `elapsedSeconds: number` — counted by setInterval(1000)
- `isMuted: boolean`
- `prevConnectionState: ConnectionState`

**Hooks used:**
- `useVoiceAssistant()` → `{state, audioTrack}` → drives orb state
- `useTrackVolume(agentAudioTrack)` → drives orb volume animation
- `useConnectionState()` — for reconnect handling
- `useLocalParticipant()` — for mic toggle
- `useRoomContext()` — for data channel + event listeners

**Mount effect — transcript load (handles refresh):**
```typescript
fetch(`/api/livekit/transcript?interviewId=${session.interviewId}`)
  .then((res) => res.json())
  .then((data) => {
    setEntries(data.entries.map(...))
    setElapsedSeconds(Math.floor(lastEntry.elapsed_ms / 1000))
  })
```

**Transcript listener (post-checkpoint state):**
```typescript
function onTranscriptionReceived(segments, participant) {
  const isBot = participant.identity.startsWith('agent') || ...
  for (const seg of segments) {
    const speaker = isBot ? 'bot' : 'client'
    const stableId = `${speaker}-${seg.id}`

    // 1. If existing id matches → update in place
    // 2. If interim (not final) with new id → SKIP (current anti-dup fix)
    // 3. If final with new id → merge with prev within 12s OR append new
  }
}
```

**Known issue after my checkpoint:** Skipping non-final interims means the participant's own transcription only appears after VAD endpoint (1.5s silence). Wave 1.6 restores live display via per-speaker liveInterim slot.

**Data channel listener (current):**
```typescript
function onDataReceived(payload) {
  const data = JSON.parse(decoded)
  if (data.type === 'phase_change') setPhase(data.phase)
  else if (data.type === 'interview_ended') onInterviewEnd({duration, topicsCount})
}
```

**Connection state effect:**
- `Connected` → `setMicrophoneEnabled(true)` to ensure mic publishes (handles rejoin case)
- `Connected → Reconnecting` → `toast.warning('Se perdio la conexion...')`
- `Reconnecting → Disconnected` + `elapsedSeconds > 120` → `onInterviewEnd` fallback
- `Reconnecting → Disconnected` + `elapsedSeconds <= 120` → `toast.error` (**dead end**)
- `Connected → Disconnected` + `elapsedSeconds > 120` → `onInterviewEnd` fallback

**End interview button (current):**
```typescript
<AlertDialog>
  <AlertDialogTrigger>Terminar entrevista</AlertDialogTrigger>
  <AlertDialogContent>...</AlertDialogContent>
  <AlertDialogAction onClick={handleEndInterview}>Terminar</AlertDialogAction>
</AlertDialog>

function handleEndInterview() {
  // 1. Send data channel {type: 'end_interview'}
  // 2. 3s fallback: forcibly call onInterviewEnd locally
}
```

### 5.3 `LobbyScreen` component

**IMPORTANT:** The lobby does **NOT** use LiveKit. It uses native `getUserMedia` + Web Audio API for the mic check. Reason: LiveKitRoom held the mic too tightly and didn't release it cleanly when transitioning to the interview room.

**Flow:**
1. `loadDevices()` — calls `getUserMedia({audio: true})` to request permission (so device labels populate), then stops the stream, then enumerates devices
2. `startMonitoring()` — reopens getUserMedia with `{deviceId: {exact: activeDeviceId}}`, creates AudioContext + AnalyserNode, polls RMS every animation frame
3. `micEverDetected.current = true` latches when `volume > 0.02` (prevents "unlatching" on silence)
4. `handleStart()` — cancelAnimationFrame + close AudioContext + stop all stream tracks + call `onStart()` (which has a 1000ms setTimeout before transitioning to 'interview' phase)

**Known issues** (identified in journey map but not fixed in this session):
- No recovery if getUserMedia throws NotAllowedError (Wave 4.2 will add helper)
- No detection of "mic granted but silent" (Wave 4.2 will add 7s timeout check)
- No device hot-swap during monitoring

### 5.4 `ConsentForm` component

**Consent items (hardcoded):**
1. "Acepto que esta entrevista sera grabada en audio para su posterior analisis."
2. "Acepto que mis respuestas seran procesadas por inteligencia artificial para generar insights de investigacion."
3. "Entiendo que mis datos seran tratados de forma confidencial y anonimizada en los reportes finales."

**Submit flow (direct link):**
1. `recordConsent(token)` → updates respondent `status='in_progress'`, sets `consent_given_at`
2. On success → POST `/api/livekit/token` → `{ token, wsUrl, interviewId, campaignInfo }`
3. Calls `onInterviewReady(data)` → transitions to lobby

**Submit flow (reusable link):**
1. `recordConsentForReusableLink(token, name)` → creates new respondent row with `status='in_progress'`, returns `respondentId`
2. POST `/api/livekit/token` with `{ token, respondentId }` → creates interview for this specific respondent
3. Calls `onInterviewReady(data)`

**Error messages:**
- `invalid` → "Este enlace de entrevista no es valido o ha expirado."
- `already_used` → "Este enlace ya fue utilizado."
- `campaign_archived` → "Esta campana ya no esta activa."
- `consent_required` → "Se requiere consentimiento antes de iniciar."
- `already_active` → "Ya tienes una entrevista activa."
- `create_failed` → "No se pudo crear la entrevista. Intenta de nuevo."

### 5.5 `page.tsx` terminal states

When the respondent hits a terminal state, page.tsx renders inline minimal cards (no `InterviewFlowWrapper`):

| Condition | Rendered |
|-----------|----------|
| Token not found in respondents OR campaigns tables | "Enlace no valido" |
| Campaign status = 'archived' | "Enlace no valido" (same card) |
| Respondent status = 'completed' | "Entrevista completada — Gracias por tu tiempo" |
| Respondent status = 'dropped' | "Sesion finalizada — Contacta al investigador" |

**Wave 2.4 extends this:** replaces the `completed` branch with an `AlreadyCompletedCard` that includes the stored `closing_summary` when present.

---

## 6. Data Channel Protocol (current)

All messages are JSON-encoded via `new TextEncoder().encode(JSON.stringify({...}))` and published with `{reliable: true}`.

### Messages sent by Python agent → frontend

| `type` | Payload | When |
|--------|---------|------|
| `phase_change` | `{ phase: "warmup" \| "conversation" \| "closing" }` | Agent calls `transition_phase(next_phase)` tool OR timing loop forces closing at 100% |
| `interview_ended` | `{ duration: int, topics_count: int }` | Agent calls `end_interview()` tool OR 110% hard-stop fires |
| `transcript` | `{ speaker: "bot", content: str, elapsed_ms: int }` | Bot turn committed via `_on_conversation_item_added` (**currently IGNORED by frontend** — frontend uses `RoomEvent.TranscriptionReceived` instead) |

### Messages sent by frontend → Python agent

| `type` | Payload | When |
|--------|---------|------|
| `text_input` | `{ text: str }` | User types in text fallback input |
| `end_interview` | `{}` | User clicks "Terminar entrevista" button |

### New messages added in Tier 0 + Tier 1

| `type` | Direction | Payload | Added in |
|--------|-----------|---------|----------|
| `finalization_hint` | agent→frontend | `{}` | Wave 1 (90% enforcement fires) |
| `ready_to_finalize` | agent→frontend | `{ summary: str, duration: int, topics_count: int }` | Wave 1 (end_interview tool or watchdog) |
| `user_confirmed_end` | frontend→agent | `{}` | Wave 1 (user clicks Finalizar modal button) |
| `user_requested_end` | frontend→agent | `{ at: number }` | Wave 2.1 (user clicks "Finalizar entrevista" early) |
| `heartbeat` | agent→frontend | `{ seq, ts_ms, elapsed_s, phase, llm_in_flight }` | Wave 3.2 (background task every 5s) |

---

## 7. Database Schema (`entrevista` namespace)

Tables and key fields relevant to the interview flow:

### `entrevista.organizations`
Not directly touched by the agent. Joined via respondents.org_id for RLS.

### `entrevista.campaigns`
```sql
id UUID PK
org_id UUID FK
name TEXT
status TEXT CHECK IN ('draft', 'active', 'paused', 'archived')
duration_target_minutes INT CHECK IN (5, 10, 15, 30)  -- migration 005
voice_id TEXT  -- voxtral-natalia, voxtral-diego, elevenlabs-sofia, elevenlabs-marco
interviewer_style TEXT  -- professional, casual, empathetic, direct
reusable_invite_enabled BOOLEAN
reusable_invite_token TEXT
```

### `entrevista.research_briefs`
```sql
id UUID PK
campaign_id UUID FK
brief_data JSONB  -- { research_goals, critical_data_points, context_background, tone_approach }
                  -- OR legacy: { goals, data_points, context, tone }
```

### `entrevista.respondents`
```sql
id UUID PK
campaign_id UUID FK
org_id UUID FK
name TEXT
email TEXT NULL
invite_token TEXT UNIQUE  -- for direct links
status TEXT  -- 'invited' | 'in_progress' | 'completed' | 'dropped'
consent_given_at TIMESTAMPTZ
```

### `entrevista.interviews` (migration 004)
```sql
id UUID PK
campaign_id UUID FK ON DELETE CASCADE
respondent_id UUID FK ON DELETE CASCADE
org_id UUID FK ON DELETE CASCADE
status TEXT DEFAULT 'active' CHECK IN ('active', 'completed', 'dropped')
started_at TIMESTAMPTZ DEFAULT now()
ended_at TIMESTAMPTZ
duration_seconds INT
recording_url TEXT
topics_count INT DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ  -- trigger-maintained
```

**RLS policies (migration 004):**
- `org_members_can_view_interviews` — SELECT where `org_id = entrevista.get_org_id()`
- `org_members_can_view_transcripts` — SELECT via join through interviews

**Service role (agent side) bypasses RLS entirely** and can read/write all rows.

### `entrevista.transcript_entries` (migration 004)
```sql
id UUID PK
interview_id UUID FK ON DELETE CASCADE
speaker TEXT CHECK IN ('bot', 'client')
content TEXT NOT NULL
elapsed_ms INT
created_at TIMESTAMPTZ
```

### Wave 1.7 additions (new migration `006_closing_summary.sql`)
```sql
ALTER TABLE entrevista.interviews
  ADD COLUMN closing_summary TEXT,
  ADD COLUMN closing_reason TEXT CHECK (closing_reason IN ('natural', 'time_up', 'user_requested', 'fallback', 'watchdog'));
```

---

## 8. Timing Guardrails (current behavior)

### 8.1 How they SHOULD work (design intent)

| Tier | Time | Intended Behavior |
|------|------|-------------------|
| 80% | 4:00 of 5min | Soft nudge — LLM is told to wrap up current topic |
| 90% | 4:30 | Extension offer OR closing prompt (depending on `_extended`) |
| 100% | 5:00 | Force closing — phase transition + system prompt injection |
| 110% | 5:30 | Canned goodbye via `session.say()` + `_delayed_close(8s)` |
| 120% | 6:00 | Silent `session.aclose()` |

### 8.2 How they ACTUALLY work (observed failures)

From real Ximena 5-min test:
1. **Background `_timing_loop` silently died** — any exception inside `_check_timing_guardrails` kills the task without logging because `asyncio.create_task(self._timing_loop())` has no done_callback. Evidence: canned goodbye fired at 7:14 (144% of target), not 5:30 (110%) — meaning it was triggered by `on_user_turn_completed` when the user finally spoke, NOT by the background loop.

2. **`_update_instructions()` + Anthropic prompt caching interaction** — even when the loop fires, updating the system prompt mid-session does NOT reliably change LLM behavior because the prompt cache is still serving the cached version.

3. **Canned goodbye TTS cut off mid-sentence** — the canned string takes ~12s to speak, but `_delayed_close(8s)` calls `aclose()` before playout completes.

4. **`interview_ended` data message not delivered** — fire-and-forget `asyncio.create_task(_publish())` inside the hard_stop branch may not execute before `aclose()` invalidates the room reference.

**Wave 1 fixes all four:**
- Robust `_timing_loop` with try/except + done_callback + task reference
- Replace `update_instructions` with `session.generate_reply(instructions=...)` synthetic directive (bypasses cache)
- Remove canned goodbye entirely — let the user click the modal button
- Replace `interview_ended` auto-send with `_pending_finalize` staging + `agent_state_changed` coordinated delivery

---

## 9. Environment Variables

### Python agent (`.env` in `agent/`)
```
LIVEKIT_URL=wss://interviewbot-3qqbzh5r.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...
MISTRAL_API_KEY=...  # For VoxtralTTS
ELEVEN_API_KEY=...    # For livekit-plugins-elevenlabs
SUPABASE_URL=https://xengrpgbrxqwrzmnmllx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
LLM_MODEL=claude-haiku-4-5-20251001
```

### Next.js frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
LIVEKIT_URL=wss://interviewbot-3qqbzh5r.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
SUPABASE_S3_ACCESS_KEY=...   # For Egress recording upload
SUPABASE_S3_SECRET_KEY=...
SUPABASE_S3_ENDPOINT=...
SUPABASE_S3_REGION=us-east-1
```

---

## 10. Known Quirks and Gotchas (Anti-Patterns to Avoid)

From accumulated debugging experience — **any refactor must preserve these fixes:**

### 10.1 `session.say()` inside timing loop causes voice overlap
**Rule:** Never call `session.say()` from the background timing loop while the agent is mid-LLM generation. Audio pipelines overlap and the user hears garbled audio.
**Wave 1 application:** Remove ALL `session.say()` calls from the timing tiers. The agent's own TTS (via `session.generate_reply(instructions=...)`) is the only path to user-facing speech.

### 10.2 Event handlers after `session.start()` are silently lost
**Rule:** Register ALL `@session.on()` handlers BEFORE `await session.start(...)`. LiveKit Agents 1.5.2 does not fire events for handlers registered after.
**Wave 1.3 application:** The new `agent_state_changed` handler MUST be registered in `entrypoint` before `session.start`.

### 10.3 Prompt cache prevents mid-session instruction updates
**Rule:** `self.update_instructions(updated)` does NOT reliably change LLM behavior when `caching="ephemeral"` is enabled. The cached prefix keeps being reused for several turns.
**Wave 1 application:** Use `session.generate_reply(instructions="...")` which injects a per-turn directive that bypasses the cache.

### 10.4 `session.room` can be None after `aclose()`
**Rule:** Any data channel send must check `hasattr(self.session, 'room') and self.session.room` before publishing.
**Wave 1 application:** Keep the existing null check in `_send_data`. Send ALL data messages BEFORE any `aclose()` call.

### 10.5 LiveKit Deepgram plugin emits interim segments with rotating IDs
**Rule:** Interim transcription segments often have different `seg.id` values than their final counterparts. Naive merging with previous entry produces cumulative duplication ("A A B A B C").
**Wave 1.6 application:** Per-speaker `liveInterim` slot — interim updates replace the slot, finals commit + clear.

### 10.6 LobbyScreen must NOT use LiveKitRoom
**Rule:** Mic monitoring in the lobby uses native `getUserMedia` + Web Audio API. Using LiveKitRoom grabs the mic and doesn't release it cleanly, causing the interview room to fail to capture audio.
**Application:** Don't touch lobby-screen.tsx's mic handling. Wave 4.2 additions go in new helper components rendered conditionally.

### 10.7 UTF-8 double-encoding from STT
**Rule:** Deepgram outputs are sometimes double-encoded UTF-8. `save_transcript_entry` must call `_fix_encoding(text)` before insert.
**Application:** Preserve this call in any future transcript-saving code paths.

### 10.8 Supabase Python client schema parameter is broken
**Rule:** `ClientOptions(schema='entrevista')` does NOT work in supabase-py 2.x. Must use `client.schema("entrevista").table(name)` per query.
**Application:** All new DB access in `supabase_client.py` uses `_table(name)` helper.

### 10.9 `interview_ended` in `on_close` must check `state.ended`
**Rule:** The session `close` event fires on graceful termination AND on unexpected disconnect. Only mark interview status='completed' when `agent._state.ended is True` (i.e., agent explicitly called end_interview). Otherwise keep as 'active' for rejoin.
**Application:** The existing on_close handler logic is correct. Preserve it.

### 10.10 Fixed USD pricing anchors wrong for MX market
**Rule:** Any user-facing pricing in proposals must use MXN ranges ($15K-$35K per phase), not USD. The `/generate-proposal` skill enforces this.
**Application:** Not touched in Tier 0/1, but any future copy must respect this.

### 10.11 Consultant role framing — agent does NOT propose during call
**Rule:** The agent is an information-gatherer, NOT a consultant that proposes solutions during the call. `interview_prompts.py` explicitly frames the agent as recopiling info only; opportunities are captured post-call.
**Application:** Any prompt changes in Wave 1 must preserve this framing.

### 10.12 RoomServiceClient needs HTTPS URL, not WSS
**Rule:** When instantiating `RoomServiceClient`, replace `wss://` with `https://` in the URL. Using WSS causes the client to hang.
**Application:** Preserved in the current `/api/livekit/token` route.

### 10.13 `add_to_chat_ctx` on `session.say()` has surprising defaults
**Rule:** `session.say(text, ...)` adds text to chat context by default. For the greeting this is fine. For any canned fallback we want to avoid polluting history.
**Application:** Not using `session.say()` in Wave 1 at all except the greeting.

---

## 11. Risk Surface Analysis for Tier 0 + Tier 1

### 11.1 High-risk changes (touch load-bearing code paths)

| Change | Risk | Mitigation |
|--------|------|------------|
| Rewrite `_check_timing_guardrails` | Breaking existing timing behavior before the new one works | Atomic replacement with new function, keep old fields on InterviewState as no-ops during transition |
| Remove `extend_interview` tool | LLM tool schema changes require session restart | Remove cleanly, no soft deprecation |
| Replace `interview_ended` data message path with new `ready_to_finalize` | Frontend currently listens only for `interview_ended` — must handle both until Wave 1 completes | Keep backward compat: frontend listens for both types during Wave 1, Wave 2 cleanup |
| Change `end_interview` tool semantics (no longer aclose) | LLM has been calling this expecting termination | New tool behavior is a superset — still marks completed, just defers aclose until user confirms |
| Update `interview_state.py` tier properties | Breaking references in `entrevista_agent.py` if not coordinated | **Rule: edit both files in one atomic sub-wave; commit only when consistent** |

### 11.2 Medium-risk changes

| Change | Risk | Mitigation |
|--------|------|------------|
| Add `agent_state_changed` event handler | Never used before in this project; unclear real-world timing jitter | 20s timeout fallback guarantees modal delivery even if state change doesn't fire |
| Per-speaker `liveInterim` transcript slot | Visual regression if render logic is wrong | Rendering through existing `TranscriptFeed` component — cosmetic only, no data loss |
| Modal state persistence via sessionStorage | Key collision with existing `interview-session-${token}` | Use distinct key `interview-finalstate-${interviewId}` |
| Heartbeat data messages at 5s interval | Increases data channel message volume ~12x/min | LiveKit reliable data channel handles this easily; no cost impact |

### 11.3 Low-risk changes (additive only)

| Change | Risk | Mitigation |
|--------|------|------------|
| New `closing_summary` / `closing_reason` columns | Schema migration is append-only | Apply migration 006 before Python agent changes deploy |
| New `/api/interviews/[id]/confirm-end` endpoint | Completely new code path | Idempotent design — safe to retry |
| New components (`<FinalizeModal>`, `<RecoveryCard>`, `<BackgroundedOverlay>`, `<AlreadyCompletedCard>`) | All new files — no existing code to break | Test rendering in isolation |
| New hooks (`useInterviewPresence`, `useTabLock`) | New code — no existing usages | Feature-test before wiring |

### 11.4 State machine coordination rules

**During Wave 1 execution:**
1. **Never leave `interview_state.py` and `entrevista_agent.py` in an inconsistent state.** Coordinate edits together, test locally before committing.
2. **Commit after each sub-wave passes smoke test.** Don't let a broken intermediate state persist across waves.
3. **The agent must be restartable at any wave boundary.** Every commit = a runnable state.
4. **Frontend fallback at 100% is the safety net.** Even if backend logic breaks during Wave 1, the frontend client-side timer will show the modal with a generic summary. Preserve this fallback as the "never stuck" guarantee.

### 11.5 What can go wrong and how we'll know

| Failure mode | Symptom | Detection | Recovery |
|--------------|---------|-----------|----------|
| Timing loop silent death | Agent keeps asking questions past 100% | Agent logs show no `forcing LLM closing` entry | Wave 1.1's try/except + done_callback + `add_done_callback` with `exc_info=True` |
| `agent_state_changed` never fires | Modal never appears after TTS | Modal appears via 20s timeout instead | Timeout fallback is the safety net |
| Prompt cache still prevents summary | LLM ignores `generate_reply` directive | Agent produces a non-summary response | Enforcement retry (already in plan) + frontend fallback summary |
| Data channel message lost | Modal never appears, frontend fallback never fires | Frontend 100% client-side timer catches it | Frontend timer is the guarantee |
| `user_confirmed_end` not delivered | Button click does nothing | 4s frontend timeout forces local transition; REST fallback marks DB | Both channels are independent — one failing doesn't block the other |
| Backend watchdog not reached | Interview row stays `active` forever | Manual SQL cleanup | Watchdog at 130% is the ultimate safety net; wave 3.2 heartbeat detection can also trigger it |

---

## 12. Testing Checklist (pre-Wave-1)

Before starting Wave 1, verify the current state is a known-good baseline:

- [x] `git log --oneline -3` shows `6cca276 checkpoint: rejoin room-expiry detection + transcript anti-duplication` as HEAD
- [ ] `cd agent && python entrevista_agent.py dev` starts without exception and logs `registered worker`
- [ ] `npm run dev -- -p 3005` starts without TypeScript errors
- [ ] Fresh incognito load of Ximena test link shows consent screen (no crash)
- [ ] Python agent version: `pip show livekit-agents` → `1.5.2`
- [ ] Supabase migration 005 applied: `SELECT DISTINCT unnest(enum_range(NULL::int_array)) FROM ...` (or check in dashboard)

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **FlowPhase** | Frontend state machine phase: loading / consent / lobby / interview / completion / rejoining |
| **ConversationPhase** | Backend interview phase: warmup / conversation / closing |
| **Tier 0** | Core modal closing flow fix (this session's Wave 1) |
| **Tier 1** | Enterprise polish: unified early-close, reconnect recovery, heartbeat, mobile, multi-tab, mic helpers (this session's Waves 2-4) |
| **Tier 2** | Full enterprise-grade infrastructure (next session) |
| **Wave** | Execution unit within a tier; each wave has a clear exit criterion and ends with a commit |
| **Guardrail** | Tiered timing check that fires at 80/90/100/110/120% of target duration (current); becoming 80/90/130% in Wave 1 |
| **Enforcement** | Wave 1's `_force_llm_closing()` via `session.generate_reply(instructions=...)` to reliably get the agent to summarize and call `end_interview` |
| **finalState** | Wave 1.5's frontend monotonic state machine: idle / showing_modal / user_confirming / finalizing / done |
| **Watchdog** | 130% backend safety net in Wave 1 — fires `aclose()` even if all other paths failed, covering the "frontend dead" case |

---

## 14. Source References

**Main plan:** `C:\Users\Waniboko\.claude\plans\shimmering-orbiting-hamster.md`
**Phase 3 context:** `.planning/phases/03-voice-interview/03-CONTEXT.md` (37 locked decisions)
**Last session journal:** `.planning/journal/2026-04-09.md`
**Handoff state:** `.planning/HANDOFF.json`
**Tier 2 reference:** Appendix B in the main plan file (will be split into `.planning/tier2/*.md` next session)

**Baseline commit:** `6cca276 checkpoint: rejoin room-expiry detection + transcript anti-duplication`

---

*End of CURRENT-SYSTEM.md. Last updated 2026-04-10 before Wave 1 execution.*
