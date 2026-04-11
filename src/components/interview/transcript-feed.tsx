'use client'

import { useEffect, useMemo, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

export type TranscriptEntry = {
  id: string
  speaker: 'bot' | 'client'
  content: string
  elapsedMs: number
}

type TranscriptFeedProps = {
  entries: TranscriptEntry[]
  /**
   * Per-speaker in-flight interim slots from Wave 1.6. Each entry is an
   * interim transcription that hasn't been committed yet (final=false from
   * Deepgram). Rendered at the bottom of the feed with reduced opacity.
   * Cleared when the corresponding final segment commits to `entries`.
   */
  liveInterim?: {
    bot?: TranscriptEntry
    client?: TranscriptEntry
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function TranscriptFeed({ entries, liveInterim }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Flatten the live interim slots into an ordered list. Client first, then bot —
  // purely for deterministic rendering if both happen to be active (rare in practice).
  const interimList = useMemo(() => {
    if (!liveInterim) return []
    const list: TranscriptEntry[] = []
    if (liveInterim.client) list.push(liveInterim.client)
    if (liveInterim.bot) list.push(liveInterim.bot)
    return list
  }, [liveInterim])

  const hasContent = entries.length > 0 || interimList.length > 0

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
  }, [entries, interimList])

  if (!hasContent) {
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
          <div
            key={entry.id}
            className="flex flex-col gap-0.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
          >
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
        {/*
          Live interim slots — rendered at the bottom with reduced opacity so the
          user sees their (or the bot's) speech appear in real time without it
          being committed permanently. Screen readers get the announcement via
          the parent aria-live region.
        */}
        {interimList.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-col gap-0.5 opacity-60 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
            aria-hidden="true"
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xs font-semibold ${
                  entry.speaker === 'bot' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {entry.speaker === 'bot' ? 'Entrevistador' : 'Participante'}
              </span>
              <span className="font-mono text-xs text-muted-foreground italic">
                en vivo
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
