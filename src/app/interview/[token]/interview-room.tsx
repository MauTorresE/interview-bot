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
import { ConnectionState, RoomEvent, type RemoteParticipant, type TranscriptionSegment } from 'livekit-client'
import { toast } from 'sonner'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { InterviewOrb } from '@/components/interview/interview-orb'
import { PhaseIndicator } from '@/components/interview/phase-indicator'
import { TranscriptFeed, type TranscriptEntry } from '@/components/interview/transcript-feed'
import { TextFallbackInput } from '@/components/interview/text-fallback-input'
import { InterviewTimer } from '@/components/interview/interview-timer'
import type { InterviewSession } from './interview-flow-wrapper'

type InterviewRoomProps = {
  session: InterviewSession
  onInterviewEnd: (data: { duration: number; topicsCount: number }) => void
}

type ConversationPhase = 'warmup' | 'conversation' | 'closing'

function InterviewRoomContent({ session, onInterviewEnd }: InterviewRoomProps) {
  const [phase, setPhase] = useState<ConversationPhase>('warmup')
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const prevConnectionState = useRef<ConnectionState>(ConnectionState.Connecting)

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

  // Listen for LiveKit built-in transcription events (matching prototype pattern)
  useEffect(() => {
    function onTranscriptionReceived(
      segments: TranscriptionSegment[],
      participant?: RemoteParticipant
    ) {
      const isBot = participant?.identity?.startsWith('agent') ||
        (participant && participant !== room.localParticipant)

      for (const seg of segments) {
        if (!seg.text?.trim()) continue
        const speaker: 'bot' | 'client' = isBot ? 'bot' : 'client'
        const stableId = `${speaker}-${seg.id}`

        setEntries((prev) => {
          const existingIdx = prev.findIndex((m) => m.id === stableId)
          if (existingIdx >= 0) {
            // Update existing segment (interim → final)
            const updated = [...prev]
            updated[existingIdx] = { ...updated[existingIdx], content: seg.text }
            return updated
          }
          return [
            ...prev,
            {
              id: stableId,
              speaker,
              content: seg.text,
              elapsedMs: elapsedSeconds * 1000,
            },
          ]
        })
      }
    }

    // Data channel for non-transcript messages (phase_change, interview_ended)
    function onDataReceived(payload: Uint8Array) {
      try {
        const text = new TextDecoder().decode(payload)
        const data = JSON.parse(text)

        if (data.type === 'phase_change' && data.phase) {
          setPhase(data.phase as ConversationPhase)
        } else if (data.type === 'interview_ended') {
          onInterviewEnd({
            duration: data.duration ?? 0,
            topicsCount: data.topics_count ?? 0,
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
  }, [room, onInterviewEnd, elapsedSeconds])

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Connection state handling (D-11) + ensure mic is enabled on connect/reconnect
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      // Ensure mic is publishing (handles rejoin where audio={true} didn't auto-publish)
      localParticipant.setMicrophoneEnabled(true).catch(() => {})
    }
    if (
      prevConnectionState.current === ConnectionState.Connected &&
      connectionState === ConnectionState.Reconnecting
    ) {
      toast.warning('Se perdio la conexion. Intentando reconectar...')
    }
    if (
      prevConnectionState.current === ConnectionState.Reconnecting &&
      connectionState === ConnectionState.Disconnected
    ) {
      // If we've been talking for >2 min, treat disconnect as interview end (not error)
      if (elapsedSeconds > 120) {
        onInterviewEnd({
          duration: elapsedSeconds,
          topicsCount: 0,
        })
      } else {
        toast.error(
          'No se pudo reconectar. La entrevista fue guardada hasta este punto.',
          { duration: Infinity }
        )
      }
    }
    // Also handle direct Connected → Disconnected (agent hard-stopped the session)
    if (
      prevConnectionState.current === ConnectionState.Connected &&
      connectionState === ConnectionState.Disconnected &&
      elapsedSeconds > 120
    ) {
      onInterviewEnd({
        duration: elapsedSeconds,
        topicsCount: 0,
      })
    }
    prevConnectionState.current = connectionState
  }, [connectionState, localParticipant])

  // Text input handler
  function handleSendText(text: string) {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'text_input', text })
    )
    room.localParticipant.publishData(payload, { reliable: true }).catch(() => {
      toast.error('No se pudo enviar el mensaje.')
    })
  }

  // Mic toggle using LiveKit's standard API
  async function handleMicToggle() {
    if (!localParticipant) return
    const newMuted = !isMuted
    await localParticipant.setMicrophoneEnabled(!newMuted)
    setIsMuted(newMuted)
  }

  // End interview via data channel
  function handleEndInterview() {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'end_interview' })
    )
    room.localParticipant.publishData(payload, { reliable: true }).catch(() => {
      // If send fails, still trigger end locally
      onInterviewEnd({ duration: elapsedSeconds, topicsCount: 0 })
    })
  }

  return (
    <div className="h-dvh flex flex-col max-w-[640px] mx-auto w-full px-4 md:px-8 py-4">
      {/* Top region: Orb + Phase */}
      <div className="flex flex-col items-center gap-2 pt-8 pb-6">
        <InterviewOrb state={orbState} volume={agentVolume} />
        <PhaseIndicator phase={phase} />
      </div>

      {/* Middle region: Transcript (flex-1) */}
      <TranscriptFeed entries={entries} />

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

          {/* End interview button */}
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" className="text-destructive hover:text-destructive" />}
            >
              Terminar entrevista
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Terminar entrevista?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto finalizara la entrevista. El entrevistador guardara un
                  resumen antes de cerrar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleEndInterview}
                >
                  Terminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
      <InterviewRoomContent {...props} />
    </LiveKitRoom>
  )
}
