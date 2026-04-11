'use client'

/**
 * AlreadyCompletedCard — Wave 2.4
 *
 * Rendered at /interview/[token] when the respondent has already completed
 * their interview (respondents.status === 'completed'). Replaces the minimal
 * "Entrevista completada" footer card with a warm thank-you surface that
 * echoes the agent's closing summary back to the user.
 *
 * Sources the summary from interviews.closing_summary (Wave 1.7 migration).
 * Shows gracefully when no summary is available (older rows, crashed closes).
 */

import { CheckCircle2, Sparkles } from 'lucide-react'

type AlreadyCompletedCardProps = {
  campaignName: string
  completedAt?: string | null
  durationSeconds?: number | null
  topicsCount?: number | null
  summaryText?: string | null
  closingReason?: string | null
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min} min ${sec} seg`
}

function formatSpanishDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    // Mexican Spanish locale format: "10 de abril de 2026, 19:44"
    return d.toLocaleString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoDate
  }
}

export function AlreadyCompletedCard({
  campaignName,
  completedAt,
  durationSeconds,
  topicsCount,
  summaryText,
}: AlreadyCompletedCardProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-card border border-border rounded-xl p-6 md:p-10 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
        {/* Hero icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-center text-foreground mb-2">
          Ya completaste esta entrevista
        </h1>

        {/* Campaign + date line */}
        <p className="text-sm text-muted-foreground text-center mb-8">
          {campaignName}
          {completedAt && (
            <>
              <span className="mx-2">·</span>
              {formatSpanishDate(completedAt)}
            </>
          )}
        </p>

        {/* Summary block (if the closing_summary is stored) */}
        {summaryText && summaryText.trim().length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resumen del entrevistador
              </span>
            </div>
            <blockquote className="text-sm text-foreground/90 leading-relaxed border-l-2 border-primary/40 pl-4 italic whitespace-pre-wrap">
              {summaryText}
            </blockquote>
          </div>
        )}

        {/* Stats row */}
        {(durationSeconds || topicsCount !== null) && (
          <dl className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground mb-8 py-4 border-t border-border/40">
            {durationSeconds != null && durationSeconds > 0 && (
              <div className="flex flex-col items-center">
                <dt className="uppercase tracking-wide mb-1">Duración</dt>
                <dd className="text-sm font-semibold text-foreground">
                  {formatDuration(durationSeconds)}
                </dd>
              </div>
            )}
            {topicsCount != null && topicsCount > 0 && (
              <div className="flex flex-col items-center">
                <dt className="uppercase tracking-wide mb-1">Temas cubiertos</dt>
                <dd className="text-sm font-semibold text-foreground">{topicsCount}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/70 text-center">
          Gracias por tu tiempo. El investigador recibirá tus insights pronto.
          Si crees que esto es un error, contacta al investigador que te invitó.
        </p>
      </div>
    </div>
  )
}
