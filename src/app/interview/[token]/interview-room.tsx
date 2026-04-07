'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LiveKitRoom,
  useAgent,
  useTrackVolume,
  useDataChannel,
  useLocalParticipant,
  useConnectionState,
} from '@livekit/components-react'
import { ConnectionState, Track, LocalAudioTrack, type DataPublishOptions } from 'livekit-client'
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

  // LiveKit hooks
  const agent = useAgent()
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()

  // Agent audio track for volume metering
  const agentMicTrack = agent.state === 'listening' || agent.state === 'thinking' || agent.state === 'speaking'
    ? agent.microphoneTrack
    : undefined
  const agentVolume = useTrackVolume(agentMicTrack)

  // Map agent state to orb state
  const orbState = (() => {
    const s = agent.state
    if (s === 'listening') return 'listening'
    if (s === 'thinking') return 'thinking'
    if (s === 'speaking') return 'speaking'
    return 'idle'
  })()

  // Data channel for text input (sending)
  const textChannel = useDataChannel('text-input')

  // Data channel for receiving messages from agent
  const handleAgentMessage = useCallback(
    (msg: { payload: Uint8Array }) => {
      try {
        const text = new TextDecoder().decode(msg.payload)
        const data = JSON.parse(text)

        if (data.type === 'phase_change' && data.phase) {
          setPhase(data.phase as ConversationPhase)
        } else if (data.type === 'interview_ended') {
          onInterviewEnd({
            duration: data.duration ?? elapsedSeconds,
            topicsCount: data.topics_count ?? 0,
          })
        } else if (data.type === 'transcript') {
          setEntries((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${prev.length}`,
              speaker: data.speaker === 'bot' ? 'bot' : 'client',
              content: data.content ?? '',
              elapsedMs: data.elapsed_ms ?? elapsedSeconds * 1000,
            },
          ])
        }
      } catch {
        // Ignore unparseable messages
      }
    },
    [elapsedSeconds, onInterviewEnd]
  )
  useDataChannel('agent', handleAgentMessage)

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Connection state handling (D-11)
  useEffect(() => {
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
      toast.error(
        'No se pudo reconectar. La entrevista fue guardada hasta este punto.',
        { duration: Infinity }
      )
    }
    prevConnectionState.current = connectionState
  }, [connectionState])

  // Text input handler
  function handleSendText(text: string) {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'text_input', text })
    )
    textChannel.send(payload, { reliable: true } as DataPublishOptions).catch(() => {
      toast.error('No se pudo enviar el mensaje.')
    })
  }

  // Mic toggle
  function handleMicToggle() {
    if (!localParticipant) return
    const micPub = localParticipant
      .getTrackPublications()
      .find((pub) => pub.source === Track.Source.Microphone)
    if (micPub?.track && micPub.track instanceof LocalAudioTrack) {
      const newMuted = !isMuted
      if (newMuted) {
        micPub.track.mute()
      } else {
        micPub.track.unmute()
      }
      setIsMuted(newMuted)
    }
  }

  // End interview via data channel
  function handleEndInterview() {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'end_interview' })
    )
    textChannel.send(payload, { reliable: true } as DataPublishOptions).catch(() => {
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
      <InterviewRoomContent {...props} />
    </LiveKitRoom>
  )
}
