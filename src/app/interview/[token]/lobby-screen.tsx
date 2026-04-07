'use client'

import { useState } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useMediaDeviceSelect,
  useTrackVolume,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
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
import { Loader2 } from 'lucide-react'
import type { InterviewSession } from './interview-flow-wrapper'

type LobbyScreenProps = {
  session: InterviewSession
  campaignName: string
  onStart: () => void
}

function LobbyContent({
  session,
  campaignName,
  onStart,
}: LobbyScreenProps) {
  const [starting, setStarting] = useState(false)

  const { devices, activeDeviceId, setActiveMediaDevice } =
    useMediaDeviceSelect({ kind: 'audioinput' })

  const { localParticipant } = useLocalParticipant()

  // Get local audio track for volume metering
  const micTrackRef = localParticipant
    ?.getTrackPublications()
    .find((pub) => pub.source === Track.Source.Microphone)?.track
    ? {
        participant: localParticipant,
        source: Track.Source.Microphone,
        publication: localParticipant
          .getTrackPublications()
          .find((pub) => pub.source === Track.Source.Microphone)!,
      }
    : undefined

  const volume = useTrackVolume(micTrackRef)
  const micDetected = volume > 0.01

  function handleStart() {
    setStarting(true)
    onStart()
  }

  return (
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
          <Select
            value={activeDeviceId}
            onValueChange={(val) => val && setActiveMediaDevice(val)}
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
  )
}

export function LobbyScreen(props: LobbyScreenProps) {
  return (
    <LiveKitRoom
      serverUrl={props.session.wsUrl}
      token={props.session.token}
      connect={true}
      audio={true}
      className="flex items-center justify-center min-h-dvh p-4"
    >
      <LobbyContent {...props} />
    </LiveKitRoom>
  )
}
