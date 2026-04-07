---
phase: 03-voice-interview
plan: 03
subsystem: ui
tags: [livekit, react, webrtc, tailwind, animation, data-channel]

# Dependency graph
requires:
  - phase: 03-voice-interview/01
    provides: InterviewFlowWrapper state machine, token route, InterviewSession type
  - phase: 03-voice-interview/02
    provides: Python agent that connects to LiveKit room and sends data channel messages
provides:
  - LobbyScreen with mic check, device selector, and campaign info
  - InterviewRoom orchestrator composing orb, transcript, text input, controls
  - Six reusable interview UI components (orb, transcript, timer, phase indicator, mic meter, text input)
  - Flow wrapper integration rendering all phases with 300ms fade transitions
affects: [03-voice-interview/04, 03-voice-interview/05]

# Tech tracking
tech-stack:
  added: []
  patterns: [LiveKit useAgent/useDataChannel hooks for agent state, CSS keyframe animations for orb states, data channel JSON messaging protocol]

key-files:
  created:
    - src/app/interview/[token]/lobby-screen.tsx
    - src/app/interview/[token]/interview-room.tsx
    - src/components/interview/interview-orb.tsx
    - src/components/interview/transcript-feed.tsx
    - src/components/interview/text-fallback-input.tsx
    - src/components/interview/interview-timer.tsx
    - src/components/interview/phase-indicator.tsx
    - src/components/interview/mic-level-meter.tsx
  modified:
    - src/app/interview/[token]/interview-flow-wrapper.tsx
    - src/app/globals.css

key-decisions:
  - "Used CSS keyframes in globals.css for orb animations rather than styled-jsx or Tailwind config extensions"
  - "Used inline style for speaking orb blob morphing driven by volume amplitude via calculateBlobRadius"
  - "Lobby wraps content in its own LiveKitRoom; interview room wraps in separate LiveKitRoom instance"

patterns-established:
  - "Data channel protocol: JSON messages with type field (text_input, phase_change, interview_ended, transcript, end_interview)"
  - "Interview orb states map from useAgent SDK states to 4 visual states (idle, listening, thinking, speaking)"
  - "Transcript entries use speaker 'bot'/'client' with elapsedMs for timestamp formatting"

requirements-completed: [WEBR-01, WEBR-05, WEBR-07, DASH-05]

# Metrics
duration: 6min
completed: 2026-04-07
---

# Phase 3 Plan 3: Interview Room UI Summary

**Lobby screen with mic check and morphing violet orb interview room with real-time transcript, text fallback, timer, and phase indicator using LiveKit data channels**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-07T04:33:03Z
- **Completed:** 2026-04-07T04:39:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Lobby screen with useMediaDeviceSelect for mic device switching and MicLevelMeter showing real-time audio detection
- Interview room orchestrating InterviewOrb (4 animated states), TranscriptFeed (auto-scroll with manual scroll pause), TextFallbackInput (data channel), mic toggle, InterviewTimer, and PhaseIndicator
- Flow wrapper updated to render LobbyScreen and InterviewRoom with 300ms fade-in transitions between all phases
- Data channel messaging protocol for bidirectional communication between frontend and Python agent

## Task Commits

Each task was committed atomically:

1. **Task 1: Lobby screen and interview UI components** - `768cb54` (feat)
2. **Task 2: Interview room orchestrator and flow wrapper integration** - `91b690a` (feat)

## Files Created/Modified
- `src/components/interview/mic-level-meter.tsx` - Volume bar with detection status text
- `src/components/interview/interview-timer.tsx` - MM:SS / MM:SS elapsed timer in Geist Mono
- `src/components/interview/phase-indicator.tsx` - Spanish phase labels with aria-live
- `src/components/interview/transcript-feed.tsx` - Scrolling transcript with auto-scroll and manual scroll pause
- `src/components/interview/text-fallback-input.tsx` - Text input with SendHorizontal icon via data channel
- `src/components/interview/interview-orb.tsx` - Morphing violet orb with idle/listening/thinking/speaking animations
- `src/app/interview/[token]/lobby-screen.tsx` - Pre-interview mic check with device selector inside LiveKitRoom
- `src/app/interview/[token]/interview-room.tsx` - Full interview room orchestrator with all components composed
- `src/app/interview/[token]/interview-flow-wrapper.tsx` - Updated to render lobby and interview room with fade transitions
- `src/app/globals.css` - Added orb animation keyframes (idle pulse, listening breathe, thinking shimmer, ripple)

## Decisions Made
- Used CSS keyframes in globals.css for orb animations (idle pulse 2s, listening breathe 3s, thinking shimmer 0.8s, ripple 1.5s) rather than styled-jsx or Tailwind config extensions for simplicity
- Speaking state uses inline style with calculateBlobRadius() driven by volume amplitude for organic blob morphing
- Lobby and interview room each wrap in their own LiveKitRoom provider (lobby connects for mic check, interview room reconnects for the actual interview)
- Used base-ui `render` prop pattern on AlertDialogTrigger instead of Radix-style `asChild` to match the project's shadcn base-nova preset

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed LocalAudioTrack type for mute/unmute**
- **Found during:** Task 2 (Interview room)
- **Issue:** `Track` base type doesn't have `mute()/unmute()` methods; they exist on `LocalAudioTrack`
- **Fix:** Added `instanceof LocalAudioTrack` check before calling mute/unmute
- **Files modified:** src/app/interview/[token]/interview-room.tsx
- **Committed in:** 91b690a (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed AlertDialogTrigger asChild prop**
- **Found during:** Task 2 (Interview room)
- **Issue:** base-ui AlertDialogTrigger doesn't support `asChild` prop (Radix pattern); uses `render` prop instead
- **Fix:** Changed to `render={<Button ... />}` pattern matching project's base-nova preset
- **Files modified:** src/app/interview/[token]/interview-room.tsx
- **Committed in:** 91b690a (Task 2 commit)

**3. [Rule 1 - Bug] Fixed Select onValueChange null handling**
- **Found during:** Task 1 (Lobby screen)
- **Issue:** base-ui Select's onValueChange passes `string | null` but setActiveMediaDevice expects `string`
- **Fix:** Added null guard: `(val) => val && setActiveMediaDevice(val)`
- **Files modified:** src/app/interview/[token]/lobby-screen.tsx
- **Committed in:** 768cb54 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the type-level fixes documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Interview room UI complete, ready for Plan 04 (CompletionCard) and Plan 05 (transcript viewer, respondents tab)
- Data channel protocol established for agent-frontend communication
- All components compile clean and existing tests pass

## Self-Check: PASSED

---
*Phase: 03-voice-interview*
*Completed: 2026-04-07*
