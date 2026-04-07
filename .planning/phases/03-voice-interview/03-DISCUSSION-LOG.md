# Phase 3: Voice Interview - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 03-voice-interview
**Areas discussed:** Interview room UX, Agent architecture, Connection & session flow, Recording & transcript storage, Time management, Scaling & concurrency, Token security, Audio recording pipeline, Frontend SDK, Researcher dashboard

---

## Interview Room UX

| Option | Description | Selected |
|--------|-------------|----------|
| Centered conversation | Transcript centered like a chat view, mic/timer controls at bottom | ✓ |
| Split panel | Transcript on left, controls/status on right panel | |
| Minimal / voice-focused | Large animated waveform in center, transcript behind toggle | |

**User's choice:** Centered conversation
**Notes:** Clean, focused layout matching dark-first aesthetic

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Transcript scrolls as conversation happens, speaker labels | ✓ |
| Toggleable overlay | Hidden by default, revealed with button | |
| Auto-hide after speaking | Shows last 2-3 messages, older ones fade | |

**User's choice:** Always visible transcript
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible at bottom | Text input bar always available below transcript | ✓ |
| Behind a toggle button | Keyboard icon reveals text input on tap | |
| Only on mic issues | Appears when mic permission denied or audio problems | |

**User's choice:** Always visible at bottom
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| AI ends naturally + manual button | AI concludes with summary, respondent has end button | ✓ |
| AI-only ending | Only AI can end via function tool | |
| Confirmation dialog on end | Manual button triggers confirmation dialog | |

**User's choice:** AI ends naturally + manual button
**Notes:** None

---

## Agent Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Agent reads from Supabase | Reads campaign config from Supabase using room metadata | ✓ |
| Frontend passes config via room metadata | Config packed into LiveKit room metadata | |
| Dedicated config API | FastAPI endpoint on Railway serves config | |

**User's choice:** Agent reads from Supabase
**Notes:** One source of truth

---

| Option | Description | Selected |
|--------|-------------|----------|
| Template with brief sections injected | Base prompt template with placeholders for 4 brief sections | ✓ |
| Claude generates the system prompt | Feed brief to Claude to generate optimized prompt | |
| You decide | Claude's discretion | |

**User's choice:** Template with brief sections injected
**Notes:** Proven pattern from prototype

---

| Option | Description | Selected |
|--------|-------------|----------|
| Provider switch at agent init | Reads persona, switches TTS provider once at session start | ✓ |
| Runtime voice switching | Can switch voices mid-interview | |
| You decide | Claude's discretion | |

**User's choice:** Provider switch at agent init
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generic insight tools | note_theme, note_quote, note_sentiment, transition_phase, end_interview | ✓ |
| Keep prototype tools as-is | Reuse prototype's exact domain-specific function tools | |
| You decide | Claude's discretion | |

**User's choice:** Generic insight tools
**Notes:** Works for any research domain, not just productivity consulting

---

## Connection & Session Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, swap view | /interview/[token] transitions from consent to interview room | ✓ |
| Redirect to interview room | Redirect to /interview/[token]/room after consent | |
| You decide | Claude's discretion | |

**User's choice:** Same page, swap view
**Notes:** Smoother UX, single route

---

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js API route | Server-side API route generates LiveKit participant token | ✓ |
| Supabase Edge Function | Edge function generates token | |
| Python agent API | FastAPI endpoint on Railway generates token | |

**User's choice:** Next.js API route
**Notes:** Keeps secrets on server, works with Vercel

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-reconnect with state recovery | LiveKit reconnection + agent keeps state in memory | ✓ |
| Simple reconnect, no recovery | LiveKit reconnects but restarts interview | |
| You decide | Claude's discretion | |

**User's choice:** Auto-reconnect with state recovery
**Notes:** None

---

## Recording & Transcript Storage

| Option | Description | Selected |
|--------|-------------|----------|
| LiveKit Egress to Supabase Storage | Composite or Track Egress records audio, uploads to Supabase Storage | ✓ |
| Agent-side recording | Agent captures audio frames, writes file, uploads | |
| You decide | Claude's discretion | |

**User's choice:** LiveKit Egress to Supabase Storage
**Notes:** Offloads recording from agent

---

| Option | Description | Selected |
|--------|-------------|----------|
| New interviews + transcript_entries tables | Separate tables with org_id for RLS | ✓ |
| Extend respondents table | Add interview columns to respondents table | |
| You decide | Claude's discretion | |

**User's choice:** New interviews + transcript_entries tables
**Notes:** Clean separation of concerns

---

| Option | Description | Selected |
|--------|-------------|----------|
| Agent writes to Supabase in real-time | Each transcript entry saved as it happens | ✓ |
| Batch write after interview | Accumulate in memory, write all at end | |
| You decide | Claude's discretion | |

**User's choice:** Agent writes to Supabase in real-time
**Notes:** Same as prototype pattern, entries available immediately

---

## Production Gaps (follow-up discussion)

User asked "do you think we've covered everything for production?" — Claude identified 6 gaps.
User asked for Claude's recommendations. All accepted as locked decisions.

### Time Management
**Claude's recommendation (accepted):** Elapsed time injected into system prompt context on every turn. Two hard guardrails: 80% → prompt nudge, 95% → forced transition to closing.
**Notes:** User confirmed. Prevents interviews from running over.

### Scaling & Concurrency
**Claude's recommendation (accepted):** Single Railway process, LiveKit Agents handles dispatch. Must support minimum 5 concurrent interviews for MVP.
**Notes:** User specified the 5-concurrent requirement explicitly.

### Token Security & Session Creation
**Claude's recommendation (accepted):** 4-step atomic flow in `/api/livekit/token`: verify token → verify consent → prevent duplicates → create interview row + room.
**Notes:** None

### Audio Recording Pipeline
**Claude's recommendation (accepted):** Start Egress on room creation, stop on interview end. Transcript is the safety net — if Egress fails, interview continues.
**Notes:** None

### Frontend SDK
**Claude's recommendation (accepted):** `@livekit/components-react` with Tailwind/shadcn styling.
**Notes:** None

### Researcher Dashboard Integration
**Claude's recommendation (accepted):** Enhance Respondents tab with interview status + transcript link. New transcript viewer page at `/campaigns/[id]/interviews/[interviewId]`.
**Notes:** None

---

## Premium Experience Research (follow-up)

User asked for "holy shit" premium product feel. Claude identified 6 UX gaps and launched 3 parallel research agents:
1. Voice AI UX patterns (ChatGPT voice mode, Gemini Live, Hume EVI, Siri, Vapi)
2. LiveKit React SDK capabilities (hooks, components, audio visualization)
3. Conversational AI pacing (VAD tuning, response delay, interruption handling)

### Pre-Interview Lobby / Mic Check
**Research finding:** Premium voice products (Zoom, Google Meet, ChatGPT) all have a pre-call device check. LiveKit provides `useMediaDeviceSelect` and `useTrackVolume` hooks for building custom mic selection + level visualization.
**Decision (D-27, D-28):** Guided mic check with device selector, real-time level meter, interviewer info. Three-phase page flow: consent → lobby → interview room with smooth fade transitions.

### AI State Visualization (Morphing Orb)
**Research finding:** ChatGPT Voice Mode's morphing orb is the dominant pattern. Uses color + shape + motion to distinguish listening/thinking/speaking. Gemini Live uses radial waveforms. Hume uses fluid metaball blobs. All use 250-300ms state transitions.
**Decision (D-29, D-30, D-31):** Violet-branded morphing orb with 4 visual states. CSS animations + Web Audio API for amplitude-reactive effects. LiveKit's `useIsSpeaking` and `useTrackVolume` hooks drive state detection.

### Interview Progress
**Research finding:** Phase labels reduce respondent anxiety ("how much longer?") without adding clutter.
**Decision (D-32):** Subtle phase label below orb: "Calentamiento" → "Conversación" → "Cierre". Received via data channel from agent's `transition_phase` tool.

### Post-Interview Screen
**Decision (D-33):** Warm completion card with campaign name, duration, topics discussed, and reassuring message.

### Conversational Pacing
**Research finding:** Silero VAD default 0.5s endpointing cuts off interview respondents mid-thought. Spanish speech has longer natural pauses. LiveKit provides `false_interruption_timeout` and `resume_false_interruption` for handling coughs/noise. Pipeline latency (300-500ms) naturally provides ideal conversational delay — no artificial delay needed.
**Decision (D-34, D-35, D-36, D-37):** VAD tuned for interviews (1.0s endpointing), smart interruption handling (2.0s false interruption timeout, resume after false interruption), no artificial delay, 12s silence re-engagement via conversational prompt.

---

## Claude's Discretion

- Mobile responsiveness of interview room
- Error states (agent disconnect, Supabase write failures, TTS/STT failures)
- Exact function tool parameter schemas for generic insight tools
- Egress format and configuration details (audio codec, file format)
- Transcript viewer page layout and styling
- Off-topic response handling prompts in the system prompt template
- Orb animation fine-tuning (exact blob shape keyframes, glow intensity, color shifts)
- Mic check "audio detected" threshold calibration

## Deferred Ideas

None — discussion stayed within phase scope
