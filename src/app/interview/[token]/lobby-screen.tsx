'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MicLevelMeter } from '@/components/interview/mic-level-meter'
import { MicPermissionHelper, SilentMicHelper } from '@/components/interview/mic-permission-helper'
import { Loader2 } from 'lucide-react'
import type { InterviewSession } from './interview-flow-wrapper'

type LobbyScreenProps = {
  session: InterviewSession
  campaignName: string
  onStart: () => void
}

export function LobbyScreen({ session, campaignName, onStart }: LobbyScreenProps) {
  const [starting, setStarting] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>('')
  const [volume, setVolume] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false) // Wave 4.2: distinct from generic error
  const [showSilentHelper, setShowSilentHelper] = useState(false) // Wave 4.2: no audio for 7s
  const micEverDetected = useRef(false)

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)

  // Enumerate audio input devices
  useEffect(() => {
    async function loadDevices() {
      try {
        // Request mic permission first so labels are populated
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())

        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput')
        setDevices(audioInputs)
        if (audioInputs.length > 0 && !activeDeviceId) {
          setActiveDeviceId(audioInputs[0].deviceId)
        }
      } catch (err) {
        // Wave 4.2: distinguish permission denied from other errors
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setMicDenied(true)
        }
        setMicError('Necesitamos acceso a tu microfono para la entrevista.')
      }
    }
    loadDevices()
  }, [])

  // Wave 4.2: silent mic detector — if mic is granted but no audio detected
  // after 7 seconds, show the SilentMicHelper checklist.
  useEffect(() => {
    if (micError || micDenied) return
    const t = setTimeout(() => {
      if (!micEverDetected.current) {
        setShowSilentHelper(true)
      }
    }, 7000)
    return () => clearTimeout(t)
  }, [micError, micDenied, activeDeviceId])

  // Start mic monitoring when device changes
  useEffect(() => {
    if (!activeDeviceId) return

    let cancelled = false

    async function startMonitoring() {
      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: activeDeviceId } },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        setMicError(null)

        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {})
        }
        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (cancelled) return
          analyser.getByteFrequencyData(dataArray)
          // RMS volume 0-1
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2
          }
          const rms = Math.sqrt(sum / dataArray.length)
          setVolume(rms)
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch (err) {
        if (!cancelled) {
          setMicError('No se pudo acceder al microfono seleccionado.')
        }
      }
    }

    startMonitoring()

    return () => {
      cancelled = true
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [activeDeviceId])

  // Latch mic detection
  if (volume > 0.02) {
    micEverDetected.current = true
  }
  const micDetected = micEverDetected.current

  function handleStart() {
    setStarting(true)
    // Stop mic monitoring and close AudioContext before handing off to interview room
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    onStart()
  }

  return (
    <div className="flex items-center justify-center min-h-dvh p-4">
      <Card className="w-full max-w-[480px] mx-auto">
        <CardContent className="p-8 flex flex-col gap-6">
          {/* Campaign info */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">
              {campaignName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrevista de {session.campaignInfo.duration} minutos
            </p>
          </div>

          {/* Mic device selector */}
          <div className="flex flex-col gap-3">
            {micDenied ? (
              /* Wave 4.2: browser-specific recovery instructions */
              <MicPermissionHelper
                onRetry={async () => {
                  setMicError(null)
                  setMicDenied(false)
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                    stream.getTracks().forEach((t) => t.stop())
                    const allDevices = await navigator.mediaDevices.enumerateDevices()
                    const audioInputs = allDevices.filter((d) => d.kind === 'audioinput')
                    setDevices(audioInputs)
                    if (audioInputs.length > 0) setActiveDeviceId(audioInputs[0].deviceId)
                  } catch {
                    setMicDenied(true)
                    setMicError('Necesitamos acceso a tu microfono para la entrevista.')
                  }
                }}
              />
            ) : micError ? (
              <p className="text-sm text-destructive">{micError}</p>
            ) : (
              <>
                <Select
                  value={activeDeviceId}
                  onValueChange={(val) => val && setActiveDeviceId(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona microfono" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microfono ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Mic level meter */}
                <MicLevelMeter volume={volume} />

                {/* Wave 4.2: silent mic helper — shown after 7s with no audio */}
                {showSilentHelper && (
                  <SilentMicHelper onDismiss={() => setShowSilentHelper(false)} />
                )}
              </>
            )}
          </div>

          {/* Interview info */}
          <div className="flex flex-col gap-1 text-sm text-foreground">
            <p>Entrevistador: {session.campaignInfo.personaName}</p>
            <p>Duracion estimada: {session.campaignInfo.duration} min</p>
          </div>

          {/* Start button */}
          <Button
            onClick={handleStart}
            disabled={!micDetected || starting}
            className="w-full h-12"
          >
            {starting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Conectando...
              </>
            ) : (
              'Comenzar entrevista'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
