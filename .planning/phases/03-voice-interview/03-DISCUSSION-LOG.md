# Phase 3: Voice Interview - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 03-voice-interview
**Areas discussed:** Interview room UX, Agent architecture, Connection & session flow, Recording & transcript storage

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

## Claude's Discretion

- Mic permission handling UX
- Mobile responsiveness of interview room
- Loading states and connection progress indicators
- Visual feedback during AI speaking vs listening
- Time management warnings
- Off-topic response handling
- Silence detection and re-engagement
- Error states
- Interview room header design
- Function tool parameter schemas
- LiveKit Egress configuration details

## Deferred Ideas

None — discussion stayed within phase scope
