'use client'

import { useMemo } from 'react'

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

type InterviewOrbProps = {
  state: OrbState
  volume: number // 0-1
}

/**
 * Calculate organic blob border-radius from volume amplitude.
 * Volume 0-1 maps to border-radius variance: 50% base +/- 15% on each corner.
 */
function calculateBlobRadius(volume: number): string {
  const base = 50
  const variance = 15 * volume
  const now = Date.now()
  const r1 = base + variance * Math.sin(now / 200)
  const r2 = base - variance * Math.cos(now / 300)
  const r3 = base + variance * Math.sin(now / 250 + 1)
  const r4 = base - variance * Math.cos(now / 350 + 2)
  const r5 = base + variance * Math.sin(now / 280 + 3)
  const r6 = base - variance * Math.cos(now / 220 + 4)
  const r7 = base + variance * Math.sin(now / 310 + 5)
  const r8 = base - variance * Math.cos(now / 270 + 6)

  return `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`
}

const GLOW_STYLES: Record<OrbState, string> = {
  idle: '0 0 40px rgba(99,102,241,0.3)',
  listening: '0 0 60px rgba(99,102,241,0.5)',
  thinking: '0 0 30px rgba(99,102,241,0.2)',
  speaking: '0 0 80px rgba(99,102,241,0.6)',
}

const ANIMATION_STYLES: Record<OrbState, React.CSSProperties> = {
  idle: {
    animation: 'orb-idle 2s ease-in-out infinite',
  },
  listening: {
    animation: 'orb-listening 3s ease-in-out infinite',
  },
  thinking: {
    transform: 'scale(0.95)',
    opacity: 0.85,
    backgroundImage:
      'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
    backgroundSize: '200% 100%',
    animation: 'orb-thinking-shimmer 0.8s linear infinite',
  },
  speaking: {},
}

const STATE_LABELS: Partial<Record<OrbState, string>> = {
  listening: 'Escuchando...',
  thinking: 'Procesando...',
}

export function InterviewOrb({ state, volume }: InterviewOrbProps) {
  const label = STATE_LABELS[state]

  const orbStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      boxShadow: GLOW_STYLES[state],
      transition: 'transform 300ms ease-out, box-shadow 300ms ease-out, opacity 300ms ease-out, border-radius 50ms linear',
      ...ANIMATION_STYLES[state],
    }

    if (state === 'speaking') {
      base.borderRadius = calculateBlobRadius(volume)
    }

    return base
  }, [state, volume])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        {/* Ripple ring for listening state */}
        {state === 'listening' && (
          <div
            className="absolute w-24 h-24 md:w-[120px] md:h-[120px] rounded-full border-2 border-primary/30"
            style={{ animation: 'orb-ripple 1.5s ease-out infinite' }}
          />
        )}

        {/* Main orb */}
        <div
          className="w-24 h-24 md:w-[120px] md:h-[120px] rounded-full bg-primary"
          style={orbStyle}
          role="img"
          aria-label={`Estado del entrevistador: ${state}`}
        />
      </div>

      {/* State label */}
      {label && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {label}
        </p>
      )}
    </div>
  )
}
