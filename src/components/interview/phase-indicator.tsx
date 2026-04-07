'use client'

type PhaseIndicatorProps = {
  phase: 'warmup' | 'conversation' | 'closing'
}

const PHASE_LABELS: Record<PhaseIndicatorProps['phase'], string> = {
  warmup: 'Calentamiento',
  conversation: 'Conversacion',
  closing: 'Cierre',
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  return (
    <p
      key={phase}
      className="text-xs font-semibold text-primary animate-in fade-in duration-200"
      aria-live="polite"
    >
      {PHASE_LABELS[phase]}
    </p>
  )
}
