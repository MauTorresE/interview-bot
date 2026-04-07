---
phase: 03-voice-interview
plan: 02
subsystem: voice-agent
tags: [livekit, python, deepgram, voxtral, elevenlabs, anthropic, supabase, websocket, tts, stt]

# Dependency graph
requires:
  - phase: 02-campaign-script-builder
    provides: campaigns, research_briefs, respondents tables in entrevista schema
  - phase: 03-voice-interview plan 01
    provides: interviews and transcript_entries tables in entrevista schema
provides:
  - Multi-tenant Python LiveKit agent with dual TTS (Voxtral/ElevenLabs)
  - 5 generic function tools for theme/quote/sentiment/phase/end
  - Real-time transcript delivery via data channel and Supabase persistence
  - Interview timing guardrails (80% nudge, 95% force-close)
  - Campaign config loading from Supabase at session start
affects: [03-voice-interview plan 03, 04-analysis, railway-deployment]

# Tech tracking
tech-stack:
  added: [livekit-agents, livekit-plugins-deepgram, livekit-plugins-anthropic, livekit-plugins-silero, livekit-plugins-elevenlabs, httpx, python-dotenv, mistralai, supabase-py]
  patterns: [VoicePipelineAgent with Agent class, function_tool decorator for LLM tools, data channel for frontend communication, asyncio.create_task for non-blocking persistence]

key-files:
  created: [agent/entrevista_agent.py, agent/voxtral_tts.py, agent/interview_state.py, agent/interview_prompts.py, agent/supabase_client.py, agent/requirements.txt, agent/Dockerfile, agent/.env.example]
  modified: []

key-decisions:
  - "Voxtral TTS timeout increased from 30s to 60s to prevent timeouts on longer utterances"
  - "save_insight is a console-logging stub until Phase 4 creates the insights table"
  - "InterviewState uses simple 3-phase model (warmup/conversation/closing) instead of prototype's 5-phase"
  - "Supabase client uses module-level singleton pattern for connection reuse"

patterns-established:
  - "Data channel dual-write: every transcript entry goes to both Supabase AND data channel"
  - "Non-blocking persistence: all Supabase writes wrapped in asyncio.create_task()"
  - "Dynamic system prompt: rebuilt with current time_context on every state change"
  - "Voice persona selection: string prefix check (elevenlabs- vs voxtral-) for TTS provider routing"

requirements-completed: [WEBR-02, WEBR-03, WEBR-04, WEBR-08]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 3 Plan 02: Python LiveKit Agent Summary

**Multi-tenant LiveKit voice agent with Voxtral/ElevenLabs TTS, 5 generic function tools, dual transcript delivery (Supabase + data channel), and 80%/95% timing guardrails**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T04:19:40Z
- **Completed:** 2026-04-07T04:23:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Complete Python agent directory ready for Railway deployment
- Agent reads campaign config from Supabase (interviews JOIN campaigns JOIN research_briefs)
- Dual TTS provider: Voxtral default (budget), ElevenLabs premium -- selected per campaign voice_persona
- 5 generic function tools work for any research domain (note_theme, note_quote, note_sentiment, transition_phase, end_interview)
- Transcript entries sent via data channel for live frontend display AND persisted to Supabase
- VAD tuned for interviews: 1.0s endpointing, 2.0s false_interruption_timeout, 12.0s user_away_timeout

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy prototype and create agent foundation files** - `515691f` (feat)
2. **Task 2: Main agent with multi-tenant session, function tools, and data channel** - `86cbeb5` (feat)

## Files Created/Modified
- `agent/entrevista_agent.py` - Multi-tenant LiveKit agent with EntrevistaAgent class, entrypoint, data channel handlers
- `agent/voxtral_tts.py` - Custom Voxtral TTS SSE adapter (copied from prototype, timeout increased to 60s)
- `agent/interview_state.py` - Interview state machine with dynamic duration, nudge/force-close thresholds
- `agent/interview_prompts.py` - System prompt template with 4 research brief sections and 4 interviewer styles
- `agent/supabase_client.py` - Supabase persistence helpers with entrevista schema, InterviewConfig dataclass
- `agent/requirements.txt` - Python dependencies for livekit-agents, plugins, supabase, httpx
- `agent/Dockerfile` - Railway deployment config (python:3.11-slim)
- `agent/.env.example` - Environment variable template for all required API keys

## Decisions Made
- Increased Voxtral TTS httpx timeout from 30s to 60s to prevent timeouts on longer utterances
- save_insight is a console-logging stub -- insights table doesn't exist yet, will be connected in Phase 4
- Simplified to 3-phase model (warmup/conversation/closing) from prototype's 5-phase (greeting/warmup/discovery/aspirations/closing) since the system prompt handles phase-specific behavior
- Used module-level singleton for Supabase client to reuse connections across async tasks

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| agent/supabase_client.py | save_insight() | Logs to console instead of persisting | Insights table doesn't exist yet -- Phase 4 will create it |

## Issues Encountered

- voxtral_tts.py import fails without httpx installed in system Python, but syntax validation passes. This is expected since httpx will be installed in the Docker container via requirements.txt.

## User Setup Required

**External services require manual configuration.** The following environment variables must be set before running the agent:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` - LiveKit Cloud credentials
- `DEEPGRAM_API_KEY` - Deepgram STT for Spanish speech recognition
- `ANTHROPIC_API_KEY` - Claude LLM for interview logic
- `MISTRAL_API_KEY` - Voxtral TTS for default voice personas
- `ELEVEN_API_KEY` - ElevenLabs TTS for premium voice personas
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase for persistence

## Next Phase Readiness
- Agent directory complete, ready for Railway deployment
- Plan 03 (interview room frontend) can connect to this agent via LiveKit room
- Data channel messages (transcript, phase_change, interview_ended) documented for frontend consumption
- Phase 4 will need to create insights table and update save_insight stub

## Self-Check: PASSED

- All 8 created files verified present on disk
- Commit 515691f (Task 1) verified in git log
- Commit 86cbeb5 (Task 2) verified in git log

---
*Phase: 03-voice-interview*
*Completed: 2026-04-07*
