'use client'

import { useState } from 'react'
import { VOICE_PERSONAS } from '@/lib/constants/campaign'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type VoicePersonaListProps = {
  selectedVoiceId: string | null
  onSelect: (voiceId: string) => void
}

export function VoicePersonaList({ selectedVoiceId, onSelect }: VoicePersonaListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)

  function handlePlay(e: React.MouseEvent, voiceId: string) {
    e.stopPropagation()
    if (playingId === voiceId) {
      setPlayingId(null)
      return
    }
    // TODO: Add voice sample audio files to /public/voices/ in Phase 3
    setPlayingId(voiceId)
    toast.info('Vista previa de voz no disponible aún')
    setTimeout(() => setPlayingId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-1">
      {VOICE_PERSONAS.map((persona) => {
        const isSelected = selectedVoiceId === persona.id
        const isPlaying = playingId === persona.id

        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onSelect(persona.id)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150',
              'hover:bg-muted/50',
              isSelected && 'border-l-[3px] border-primary bg-primary/10'
            )}
          >
            <div
              className={cn(
                'size-4 shrink-0 rounded-full border-2',
                isSelected
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/40'
              )}
            >
              {isSelected && (
                <div className="flex size-full items-center justify-center">
                  <div className="size-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground">
                {persona.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {persona.provider === 'voxtral' ? 'Voxtral' : 'ElevenLabs'}
              </span>
            </div>

            {persona.premium && (
              <Badge variant="outline" className="text-xs">
                Premium
              </Badge>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={(e) => handlePlay(e, persona.id)}
            >
              {isPlaying ? (
                <Pause className="size-4 text-primary" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
          </button>
        )
      })}
    </div>
  )
}
