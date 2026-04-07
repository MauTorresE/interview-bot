'use client'

import { useEffect, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export type TranscriptEntry = {
  id: string
  speaker: 'bot' | 'client'
  content: string
  elapsedMs: number
}

type TranscriptFeedProps = {
  entries: TranscriptEntry[]
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TranscriptFeed({ entries }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    autoScrollRef.current = distanceFromBottom < 100
  }, [])

  useEffect(() => {
    if (autoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div
        role="log"
        aria-live="polite"
        className="flex flex-1 items-center justify-center"
      >
        <p className="text-sm text-muted-foreground">
          La transcripcion aparecera aqui cuando comience la entrevista.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        className="flex flex-col gap-4 py-4"
      >
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-0.5 animate-in fade-in duration-150">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xs font-semibold ${
                  entry.speaker === 'bot' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {entry.speaker === 'bot' ? 'Entrevistador' : 'Participante'}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatElapsed(entry.elapsedMs)}
              </span>
            </div>
            <p className="text-sm text-foreground">{entry.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
