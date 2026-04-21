'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useTrackVolume,
  useLocalParticipant,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react'
import {
  ConnectionState,
  RoomEvent,
  type Participant,
  type TranscriptionSegment,
  type TrackPublication,
} from 'livekit-client'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InterviewOrb } from '@/components/interview/interview-orb'
import { PhaseIndicator } from '@/components/interview/phase-indicator'
import { TranscriptFeed, type TranscriptEntry } from '@/components/interview/transcript-feed'
import { TextFallbackInput } from '@/components/interview/text-fallback-input'
import { InterviewTimer } from '@/components/interview/interview-timer'
import { FinalizeModal } from '@/components/interview/finalize-modal'
import { RecoveryCard, type RecoveryVariant } from '@/components/interview/recovery-card'
import { useInterviewPresence } from '@/hooks/use-interview-presence'
import type { InterviewSession } from './interview-flow-wrapper'

// Tier 2.2: thresholds for the agent-warming-up overlay. Exported constants
// instead of inline magic numbers so they're easy to tune from one place
// and obvious to readers what the timing story is.
const AGENT_WAIT_GRACE_SECONDS = 3         // fast-join doesn't flash the overlay
const AGENT_WAIT_COUNTER_AFTER = 15        // show elapsed-seconds to reassure user
const AGENT_WAIT_ESCAPE_AFTER = 30         // offer a "reload page" button

type InterviewRoomProps = {
  session: InterviewSession
  inviteToken: string
  onInterviewEnd: (data: { duration: number; topicsCount: number }) => void
}

/**
 * Shape of the finalization state persisted to sessionStorage (Wave 2.3).
 * Stored under `interview-finalstate-${inviteToken}` whenever finalizeState
 * transitions to a non-idle kind. Recovered on mount by interview-flow-wrapper
 * so refresh during the modal is a non-event — the modal reappears immediately
 * with the same summary text.
 */
export type PersistedFinalState = {
  version: 1
  kind: 'showing_modal' | 'finalizing'
  summary: string
  source: 'agent' | 'frontend_fallback' | 'user_early'
  shownAt: number
  savedAt: number
}

type ConversationPhase = 'warmup' | 'conversation' | 'closing'

/**
 * Monotonic finalization state machine (Wave 1.5).
 *
 * Transitions: idle → showing_modal → finalizing → (unmount via onInterviewEnd)
 *
 * Multiple trigger paths call requestModal() but only the first one wins:
 *   - Agent-delivered via ready_to_finalize data message (happy path, source='agent')
 *   - Frontend 100% client-side timer fallback (source='frontend_fallback')
 *   - User clicking the early-close button (Wave 2.1, source='user_early')
 *
 * Once in showing_modal, a 90s auto-click fallback guarantees forward progress
 * even if the user ignores the modal. Once in finalizing, a 4s hard timeout
 * forces onInterviewEnd locally if the agent hasn't closed us by then.
 */
type FinalizeState =
  | { kind: 'idle' }
  | {
      kind: 'showing_modal'
      summary: string
      source: 'agent' | 'frontend_fallback' | 'user_early'
      shownAt: number
    }
  | { kind: 'finalizing' }

function InterviewRoomContent({ session, inviteToken, onInterviewEnd }: InterviewRoomProps) {
  const [phase, setPhase] = useState<ConversationPhase>('warmup')
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const prevConnectionState = useRef<ConnectionState>(ConnectionState.Connecting)

  // Wave 1.5: monotonic finalization state machine
  const [finalizeState, setFinalizeState] = useState<FinalizeState>({ kind: 'idle' })
  const [showWrapupBanner, setShowWrapupBanner] = useState(false)
  const autoClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hardFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Wave 1.6: per-speaker live interim slot. Deepgram STT emits interim
  // segments with rotating ids, so we can't treat them as part of the
  // committed entries list (would duplicate as "A A B A B C"). Instead we
  // store the latest interim per speaker here and render it as a fading
  // overlay at the bottom of the transcript. When a final segment arrives,
  // we commit it to `entries` and clear the slot.
  const [liveInterim, setLiveInterim] = useState<{
    bot?: TranscriptEntry
    client?: TranscriptEntry
  }>({})

  // Wave 3.1: recovery overlay state. Replaces dead-end toasts with an
  // actionable RecoveryCard when the connection degrades beyond reconnection.
  const [recoveryVariant, setRecoveryVariant] = useState<RecoveryVariant | null>(null)

  // Wave 3.2: agent heartbeat tracking. The Python agent publishes a heartbeat
  // every 5s. If we don't receive one for 45s while connected and not finalizing,
  // we show the agent_unresponsive recovery card.
  // Starts as null — watchdog only activates after the FIRST heartbeat arrives,
  // so agents that don't support heartbeats (or aren't running) don't trigger
  // false alarms.
  const lastHeartbeatAt = useRef<number | null>(null)

  // Wave 3.3: wake lock + tab visibility tracking for mobile resilience
  const { isBackgrounded } = useInterviewPresence()

  /**
   * Request the modal to be shown. Monotonic: only fires when state is idle.
   * All trigger paths (agent data msg, frontend fallback timer, early-close button)
   * funnel through this so duplicate requests are no-ops.
   */
  const requestModal = useCallback(
    (payload: {
      summary: string
      source: 'agent' | 'frontend_fallback' | 'user_early'
    }) => {
      setFinalizeState((prev) => {
        if (prev.kind !== 'idle') return prev
        return {
          kind: 'showing_modal',
          summary: payload.summary,
          source: payload.source,
          shownAt: Date.now(),
        }
      })
    },
    []
  )

  const targetSeconds = session.campaignInfo.duration * 60

  // Load existing transcript from Supabase on mount (handles rejoin after refresh)
  useEffect(() => {
    async function loadTranscript() {
      try {
        const res = await fetch(`/api/livekit/transcript?interviewId=${session.interviewId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.entries?.length > 0) {
            setEntries(data.entries.map((e: { id: string; speaker: string; content: string; elapsed_ms: number }) => ({
              id: e.id,
              speaker: e.speaker as 'bot' | 'client',
              content: e.content,
              elapsedMs: e.elapsed_ms,
            })))
            // Resume elapsed time from last entry
            const lastMs = data.entries[data.entries.length - 1].elapsed_ms
            if (lastMs > 0) {
              setElapsedSeconds(Math.floor(lastMs / 1000))
            }
          }
        }
      } catch {
        // Silently fail — fresh interview has no transcript
      }
    }
    loadTranscript()
  }, [session.interviewId])

  // LiveKit hooks
  const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant()
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()

  // Agent audio track for volume metering
  const agentVolume = useTrackVolume(agentAudioTrack)

  // Tier 2.2: track whether the agent has joined the room. If the Railway
  // worker is cold-booting, the participant can be connected for many seconds
  // before the agent participant dispatches — a blank room during that window
  // reads as a broken app. Flip `agentJoined` true the first time we see an
  // agent audio track, and only ever show the loading overlay while waiting.
  const [agentJoined, setAgentJoined] = useState<boolean>(false)
  const [waitingSecondsForAgent, setWaitingSecondsForAgent] = useState<number>(0)
  useEffect(() => {
    if (agentAudioTrack && !agentJoined) setAgentJoined(true)
  }, [agentAudioTrack, agentJoined])
  useEffect(() => {
    if (agentJoined || connectionState !== ConnectionState.Connected) return
    const started = Date.now()
    const iv = setInterval(() => {
      setWaitingSecondsForAgent(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [agentJoined, connectionState])

  // Show the overlay only after a short grace (so fast-join, warm-agent path
  // doesn't flash it) and only while still in the idle phase of the interview.
  const showAgentWaitingOverlay =
    !agentJoined &&
    connectionState === ConnectionState.Connected &&
    waitingSecondsForAgent >= AGENT_WAIT_GRACE_SECONDS &&
    finalizeState.kind === 'idle' &&
    !recoveryVariant

  // Map agent state to orb state
  const orbState = (() => {
    const s = agentState
    if (s === 'listening') return 'listening'
    if (s === 'thinking') return 'thinking'
    if (s === 'speaking') return 'speaking'
    return 'idle'
  })()

  // Raw data channel via room context (matches prototype pattern)
  const room = useRoomContext()

  // Listen for LiveKit built-in transcription events.
  //
  // Wave 1.6: per-speaker live interim slot pattern.
  //
  // Deepgram STT emits interim segments with rotating ids (each interim chunk
  // may have a new seg.id AND cumulative text like "A" → "A B" → "A B C").
  // My previous fix skipped all non-final segments to prevent duplication,
  // which correctly eliminated the "A A B A B C" bug but broke live display —
  // transcripts only appeared after VAD endpoint (1.5s of silence).
  //
  // The new approach tracks a single in-flight interim per speaker in a
  // dedicated `liveInterim` state. Each interim update REPLACES the slot
  // instead of appending. When a final segment arrives, it commits to the
  // `entries` list and clears the slot. The TranscriptFeed renders committed
  // entries plus any active slots at the bottom with reduced opacity.
  useEffect(() => {
    function onTranscriptionReceived(
      segments: TranscriptionSegment[],
      participant?: Participant,
      _publication?: TrackPublication,
    ) {
      // Identify the bot: either its identity starts with "agent" (LiveKit
      // agent naming convention) or it's not the local participant at all.
      // Using Participant (the common parent of RemoteParticipant and
      // LocalParticipant) makes the comparison type-safe.
      const isBot = participant?.identity?.startsWith('agent') ||
        (!!participant && participant.identity !== room.localParticipant.identity)

      for (const seg of segments) {
        if (!seg.text?.trim()) continue
        const speaker: 'bot' | 'client' = isBot ? 'bot' : 'client'
        const stableId = `${speaker}-${seg.id}`
        const currentMs = elapsedSeconds * 1000

        if (!seg.final) {
          // Interim segment — goes to the live slot for this speaker.
          // REPLACES whatever was there (cumulative text overwrites).
          // When a new id arrives with different text, this naturally
          // discards the old interim without appending anything.
          setLiveInterim((prev) => ({
            ...prev,
            [speaker]: {
              id: `interim-${speaker}`,
              speaker,
              content: seg.text,
              elapsedMs: currentMs,
            },
          }))
          continue
        }

        // Final segment — clear the live slot for this speaker and commit
        // to entries. Done in separate setState calls so React can batch them.
        setLiveInterim((prev) => {
          if (!prev[speaker]) return prev
          const next = { ...prev }
          delete next[speaker]
          return next
        })

        setEntries((prev) => {
          // Update in place if this exact segment id already exists (rare
          // but safe — some LiveKit paths emit the same id twice).
          const existingIdx = prev.findIndex((m) => m.id === stableId)
          if (existingIdx >= 0) {
            const updated = [...prev]
            updated[existingIdx] = { ...updated[existingIdx], content: seg.text }
            return updated
          }

          // Merge with the previous entry if same speaker and within 12s.
          // This keeps consecutive same-speaker utterances from each arriving
          // Deepgram final segment grouped into one logical turn.
          const lastEntry = prev[prev.length - 1]
          if (
            lastEntry &&
            lastEntry.speaker === speaker &&
            Math.abs(currentMs - lastEntry.elapsedMs) < 12000
          ) {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...lastEntry,
              content: lastEntry.content + ' ' + seg.text,
            }
            return updated
          }

          // Otherwise append as a new entry.
          return [
            ...prev,
            {
              id: stableId,
              speaker,
              content: seg.text,
              elapsedMs: currentMs,
            },
          ]
        })
      }
    }

    // Data channel for non-transcript messages.
    //
    // Wave 1.5 adds handlers for the Tier 0 modal closing flow:
    //   phase_change        — conversation phase sync (existing)
    //   finalization_hint   — show the top wrap-up banner (agent entering closing)
    //   ready_to_finalize   — request the modal with a summary from the agent
    //   interview_ended     — legacy teardown message, still supported. When the
    //                         finalize flow has already owned the UI (showing_modal
    //                         or finalizing), this is just the expected post-
    //                         confirmation signal — we let the 4s hard-fallback
    //                         in handleConfirmFinalize transition the UI instead
    //                         of double-firing onInterviewEnd here.
    function onDataReceived(payload: Uint8Array) {
      try {
        const text = new TextDecoder().decode(payload)
        const data = JSON.parse(text)

        if (data.type === 'heartbeat') {
          // Wave 3.2: update heartbeat tracker + clear agent_unresponsive
          lastHeartbeatAt.current = Date.now()
          if (recoveryVariant === 'agent_unresponsive') {
            setRecoveryVariant(null)
          }
        } else if (data.type === 'phase_change' && data.phase) {
          setPhase(data.phase as ConversationPhase)
        } else if (data.type === 'finalization_hint') {
          setShowWrapupBanner(true)
        } else if (data.type === 'ready_to_finalize') {
          requestModal({
            summary: typeof data.summary === 'string' && data.summary.trim()
              ? data.summary
              : 'Gracias por tu tiempo.',
            source: 'agent',
          })
        } else if (data.type === 'interview_ended') {
          // If the finalize machine is already active, let it run its course
          // (handleConfirmFinalize has its own 4s hard fallback to onInterviewEnd).
          // Otherwise this is a legacy backend path — transition directly.
          setFinalizeState((prev) => {
            if (prev.kind === 'idle') {
              onInterviewEnd({
                duration: data.duration ?? 0,
                topicsCount: data.topics_count ?? 0,
              })
            }
            return prev
          })
        }
      } catch {
        // Ignore unparseable messages
      }
    }

    room.on(RoomEvent.TranscriptionReceived, onTranscriptionReceived)
    room.on(RoomEvent.DataReceived, onDataReceived)
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscriptionReceived)
      room.off(RoomEvent.DataReceived, onDataReceived)
    }
  }, [room, onInterviewEnd, elapsedSeconds, requestModal])

  // Wave 1.5: frontend client-side fallback timer at 100% elapsed.
  // If the agent hasn't delivered ready_to_finalize by the time the target
  // duration is reached, show the modal with a generic summary. This is the
  // "backend is dead" safety net — runs even if the Python agent has crashed.
  useEffect(() => {
    if (finalizeState.kind !== 'idle') return
    // If the wrap-up banner is showing, the agent has already started its
    // two-phase closing (phase-1 "anything else?" in flight). Don't fire the
    // frontend fallback — it would cut off the agent's natural closing.
    // The 130% backend watchdog remains as the ultimate safety net.
    if (showWrapupBanner) return
    if (targetSeconds > 0 && elapsedSeconds >= targetSeconds) {
      requestModal({
        summary:
          'Gracias por tu tiempo. Con esta conversación tenemos suficiente información para preparar una propuesta personalizada.',
        source: 'frontend_fallback',
      })
    }
  }, [elapsedSeconds, targetSeconds, finalizeState.kind, showWrapupBanner, requestModal])

  // Wave 2.3: persist finalizeState to sessionStorage so a browser refresh
  // during the modal is a non-event. The parent InterviewFlowWrapper checks
  // this key on mount and, if present and fresh (<10 min), renders a
  // standalone <FinalizeModal> without reconnecting to LiveKit — the user
  // clicks Finalizar and transitions straight to the completion card.
  //
  // Cleared on transition to idle (never happens — machine is monotonic)
  // or by the parent's onInterviewEnd handler after confirm.
  useEffect(() => {
    const key = `interview-finalstate-${inviteToken}`
    if (finalizeState.kind === 'idle') {
      try { sessionStorage.removeItem(key) } catch { /* ignore */ }
      return
    }
    const payload: PersistedFinalState = {
      version: 1,
      kind: finalizeState.kind,
      summary:
        finalizeState.kind === 'showing_modal' ? finalizeState.summary : '',
      source:
        finalizeState.kind === 'showing_modal' ? finalizeState.source : 'agent',
      shownAt:
        finalizeState.kind === 'showing_modal'
          ? finalizeState.shownAt
          : Date.now(),
      savedAt: Date.now(),
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(payload))
    } catch { /* ignore */ }
  }, [finalizeState, inviteToken])

  // Wave 1.5: 90-second auto-click fallback. If the modal has been visible
  // for 90 seconds with no user click (e.g., user walked away, notification
  // covering the screen), automatically fire the confirm flow so the session
  // teardown completes cleanly.
  useEffect(() => {
    if (finalizeState.kind !== 'showing_modal') return
    const id = setTimeout(() => {
      handleConfirmFinalize()
    }, 90_000)
    autoClickTimerRef.current = id
    return () => {
      clearTimeout(id)
      if (autoClickTimerRef.current === id) {
        autoClickTimerRef.current = null
      }
    }
    // handleConfirmFinalize is stable within a render but referenced by the
    // linter — we intentionally only re-run on state kind change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizeState.kind])

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Wave 3.2: heartbeat watchdog — check every 10s if the agent has gone silent.
  // If no heartbeat for 45s while connected and not in finalization, show the
  // agent_unresponsive recovery card. 45s is generous enough to avoid false
  // positives during normal LLM thinking pauses (~10-20s) while still catching
  // actual agent crashes. Clears automatically when a heartbeat arrives
  // (handled in the data channel listener above).
  useEffect(() => {
    const id = setInterval(() => {
      if (lastHeartbeatAt.current === null) return // No heartbeat received yet — agent may not support it
      const gap = Date.now() - lastHeartbeatAt.current
      if (
        gap > 45_000 &&
        connectionState === ConnectionState.Connected &&
        finalizeState.kind === 'idle' &&
        recoveryVariant !== 'agent_unresponsive'
      ) {
        setRecoveryVariant('agent_unresponsive')
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [connectionState, finalizeState.kind, recoveryVariant])

  // Connection state handling (D-11) + ensure mic is enabled on connect/reconnect.
  //
  // Wave 3.1: replaced dead-end toasts with RecoveryCard overlays. The user
  // now gets actionable buttons (Retry / Save & Exit) instead of a static
  // error toast they can't do anything with.
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      // Ensure mic is publishing (handles rejoin where audio={true} didn't auto-publish)
      localParticipant.setMicrophoneEnabled(true).catch(() => {})
      // Clear any recovery overlay on successful (re)connection
      setRecoveryVariant(null)
    }
    if (
      prevConnectionState.current === ConnectionState.Connected &&
      connectionState === ConnectionState.Reconnecting
    ) {
      setRecoveryVariant('reconnecting')
    }
    if (
      prevConnectionState.current === ConnectionState.Reconnecting &&
      connectionState === ConnectionState.Disconnected
    ) {
      // If finalize flow already owns the UI, let it handle teardown
      if (finalizeState.kind !== 'idle') {
        // noop — handleConfirmFinalize's 4s fallback will transition
      } else if (elapsedSeconds > 120) {
        // Long interview disconnect — show network_lost with save option
        setRecoveryVariant('network_lost')
      } else {
        setRecoveryVariant('network_lost')
      }
    }
    // Direct Connected → Disconnected (agent hard-stopped the session)
    if (
      prevConnectionState.current === ConnectionState.Connected &&
      connectionState === ConnectionState.Disconnected
    ) {
      if (finalizeState.kind !== 'idle') {
        // Finalize flow owns it — expected disconnect after user_confirmed_end
      } else if (elapsedSeconds > 120) {
        onInterviewEnd({ duration: elapsedSeconds, topicsCount: 0 })
      } else {
        setRecoveryVariant('network_lost')
      }
    }
    prevConnectionState.current = connectionState
  }, [connectionState, localParticipant, finalizeState.kind, elapsedSeconds, onInterviewEnd])

  // Text input handler
  function handleSendText(text: string) {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'text_input', text })
    )
    room.localParticipant.publishData(payload, { reliable: true }).catch(() => {})
  }

  // Mic toggle using LiveKit's standard API
  async function handleMicToggle() {
    if (!localParticipant) return
    const newMuted = !isMuted
    await localParticipant.setMicrophoneEnabled(!newMuted)
    setIsMuted(newMuted)
  }

  // Wave 1.5: handle user clicking the Finalizar button in the modal.
  //
  // Sends user_confirmed_end over the data channel so the backend can mark
  // the interview completed in Supabase and gracefully tear down the session.
  // A 4s hard fallback forces the local UI transition if the backend doesn't
  // disconnect us — covers the case where the data message was lost or the
  // Python agent crashed mid-confirmation.
  // Wave 3.1: dual-channel confirm — fires both data channel AND REST API
  // so at least one path marks the interview completed in the DB, even if
  // the LiveKit connection is degraded or the agent has crashed.
  function handleConfirmFinalize() {
    // Cancel the 90s auto-click timer — we're taking over
    if (autoClickTimerRef.current) {
      clearTimeout(autoClickTimerRef.current)
      autoClickTimerRef.current = null
    }

    setFinalizeState({ kind: 'finalizing' })

    // Channel 1: data channel (reaches the live agent if connected)
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'user_confirmed_end', at: Date.now() })
    )
    room.localParticipant
      .publishData(payload, { reliable: true })
      .catch(() => {})

    // Channel 2: REST fallback (marks completed in DB even if agent is dead)
    fetch(`/api/interviews/${session.interviewId}/confirm-end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: elapsedSeconds }),
    }).catch(() => {})

    // Hard fallback: if the backend doesn't close the session within 4s,
    // force the local UI transition anyway. Clean UX > stuck spinner.
    if (hardFallbackTimerRef.current) {
      clearTimeout(hardFallbackTimerRef.current)
    }
    hardFallbackTimerRef.current = setTimeout(() => {
      onInterviewEnd({ duration: elapsedSeconds, topicsCount: 0 })
    }, 4000)
  }

  // Wave 3.1: recovery card action handlers
  function handleRecoveryRetry() {
    setRecoveryVariant(null)
    // Force room reconnect by re-enabling mic (triggers LiveKit internal reconnect)
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(true).catch(() => {})
    }
  }

  function handleRecoverySave() {
    // Mark interview completed via REST and transition to completion card
    fetch(`/api/interviews/${session.interviewId}/confirm-end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration: elapsedSeconds,
        reason: 'network_interrupted',
      }),
    }).catch(() => {})
    onInterviewEnd({ duration: elapsedSeconds, topicsCount: 0 })
  }

  // Wave 2.1: user clicks "Finalizar entrevista" early.
  //
  // Instead of an abrupt kill (the old Wave 0 behavior), this now routes
  // through the SAME flow as the happy path: we send user_requested_end to
  // the backend, which triggers _force_llm_closing("user_requested"). The
  // LLM then produces a warm personalized summary using the user-requested
  // instruction variant (acknowledges early close with gratitude, not "I see
  // you have to go"). The modal appears via the normal ready_to_finalize
  // delivery path with TTS coordination.
  //
  // UX flow after click:
  //   1. showWrappingUp banner appears immediately at the top
  //   2. Backend receives user_requested_end, fires _force_llm_closing
  //   3. LLM generates summary + calls end_interview tool
  //   4. agent_state_changed handler delivers ready_to_finalize after TTS
  //   5. Modal fades in with the agent's summary
  //   6. User clicks Finalizar in the modal → normal handleConfirmFinalize path
  //
  // 12-second safety net: if no modal has appeared by then (LLM crashed,
  // data channel dropped, etc.), the frontend client-side fallback timer
  // at 100% elapsed OR the 12s timeout here will show a generic modal so
  // the user never sees a stuck "Cerrando con un resumen..." banner forever.
  function handleEndInterview() {
    // Idempotent: if the modal is already showing or we're finalizing,
    // this click does nothing (prevents double-fire from impatient users)
    if (finalizeState.kind !== 'idle') return

    setShowWrapupBanner(true)

    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'user_requested_end', at: Date.now() })
    )
    room.localParticipant.publishData(payload, { reliable: true }).catch(() => {})

    // Safety net: if backend doesn't deliver ready_to_finalize within 12s
    // AND the frontend fallback hasn't already fired, show a generic modal
    // so the user isn't stuck staring at the banner.
    setTimeout(() => {
      setFinalizeState((prev) => {
        if (prev.kind !== 'idle') return prev
        return {
          kind: 'showing_modal',
          summary:
            'Gracias por tu tiempo. Con esta conversación tenemos suficiente información para preparar una propuesta personalizada.',
          source: 'user_early',
          shownAt: Date.now(),
        }
      })
    }, 12_000)
  }

  return (
    <div className="h-dvh flex flex-col max-w-[640px] mx-auto w-full px-4 md:px-8 py-4">
      {/* Wrap-up banner (Waves 1.5 + 2.1) — shown when the agent is wrapping up.
          Two source paths:
            - Time-up (90% enforcement): backend sends finalization_hint
            - User-requested (Wave 2.1): frontend sets showWrapupBanner directly
              when the Finalizar entrevista button is clicked
          Both produce the same visual — the user can't tell them apart, which
          is intentional. Hides the moment the modal takes over the viewport. */}
      {showWrapupBanner && finalizeState.kind === 'idle' && (
        <div
          className="w-full text-center text-xs text-muted-foreground py-2 mb-1 rounded-md bg-muted/30 border border-border/40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
          role="status"
          aria-live="polite"
        >
          El entrevistador está cerrando la conversación...
        </div>
      )}

      {/* Finalize modal (Wave 1.5) — shown when ready_to_finalize is delivered
          OR the frontend 100% fallback timer fires */}
      {(finalizeState.kind === 'showing_modal' || finalizeState.kind === 'finalizing') && (
        <FinalizeModal
          summary={
            finalizeState.kind === 'showing_modal'
              ? finalizeState.summary
              : 'Gracias por tu tiempo.'
          }
          agentState={agentState}
          onConfirm={handleConfirmFinalize}
          confirming={finalizeState.kind === 'finalizing'}
        />
      )}

      {/* Wave 3.1: recovery overlay for connection failures */}
      {recoveryVariant && finalizeState.kind === 'idle' && (
        <RecoveryCard
          variant={recoveryVariant}
          onPrimary={handleRecoveryRetry}
          onSecondary={handleRecoverySave}
        />
      )}

      {/* Wave 3.3: backgrounded overlay for mobile tab-switch / screen-lock */}
      {isBackgrounded && finalizeState.kind === 'idle' && !recoveryVariant && (
        <RecoveryCard variant="backgrounded" />
      )}

      {/* Tier 2.2: agent-warming-up overlay. Fires when we're connected to
          the LiveKit room but the agent participant hasn't joined yet after
          AGENT_WAIT_GRACE_SECONDS — typically because the Railway worker is
          cold-booting. Disappears the instant the agent's audio track appears.
          After AGENT_WAIT_ESCAPE_AFTER, offers a reload button so the user
          isn't trapped if the agent genuinely never shows. */}
      {showAgentWaitingOverlay && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-sm text-center px-6">
            <div className="mx-auto mb-5 size-10 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            <h3 className="text-base font-semibold text-foreground mb-1">
              Preparando tu entrevistador…
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esto suele tomar unos segundos. Si llevas más de un minuto aquí,
              recarga la página.
            </p>
            {waitingSecondsForAgent >= AGENT_WAIT_COUNTER_AFTER && (
              <p className="mt-3 text-xs text-muted-foreground/80">
                Tiempo de espera: {waitingSecondsForAgent}s
              </p>
            )}
            {waitingSecondsForAgent >= AGENT_WAIT_ESCAPE_AFTER && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Recargar página
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Top region: Orb + Phase */}
      <div className="flex flex-col items-center gap-2 pt-8 pb-6">
        <InterviewOrb state={orbState} volume={agentVolume} />
        <PhaseIndicator phase={phase} />
      </div>

      {/* Middle region: Transcript (flex-1) */}
      <TranscriptFeed entries={entries} liveInterim={liveInterim} />

      {/* Bottom controls */}
      <div className="flex flex-col gap-3 pb-4 pt-3">
        {/* Text input */}
        <TextFallbackInput
          onSend={handleSendText}
          disabled={orbState === 'speaking'}
        />

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Mic toggle */}
          <button
            type="button"
            onClick={handleMicToggle}
            className={`flex items-center justify-center w-11 h-11 rounded-lg transition-colors duration-150 ${
              isMuted
                ? 'bg-destructive/10 text-destructive'
                : 'bg-card text-foreground'
            }`}
            aria-label={isMuted ? 'Activar microfono' : 'Silenciar microfono'}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* Wave 2.1: Finalizar entrevista button.
              No confirmation dialog — the click is the request to the agent to
              wrap up with a warm summary, and the user confirms the actual end
              in the modal that follows. Same routing and same UX as the happy
              path — just initiated by the user instead of the 90% timer. */}
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleEndInterview}
            disabled={finalizeState.kind !== 'idle' || showWrapupBanner}
          >
            Finalizar entrevista
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Timer */}
          <InterviewTimer
            elapsedSeconds={elapsedSeconds}
            targetSeconds={targetSeconds}
          />
        </div>
      </div>
    </div>
  )
}

export function InterviewRoom(props: InterviewRoomProps) {
  return (
    <LiveKitRoom
      serverUrl={props.session.wsUrl}
      token={props.session.token}
      connect={true}
      audio={true}
      className="w-full"
    >
      <RoomAudioRenderer />
      <InterviewRoomContent
        session={props.session}
        inviteToken={props.inviteToken}
        onInterviewEnd={props.onInterviewEnd}
      />
    </LiveKitRoom>
  )
}
