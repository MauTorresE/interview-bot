'use client'

/**
 * RecoveryCard — Wave 3.1
 *
 * Universal recovery UI for interview failure states. Replaces dead-end
 * toasts with an actionable card that gives the user a clear next step.
 *
 * Tier 1 ships with 4 variants (reconnecting, network_lost,
 * agent_unresponsive, backgrounded). Tier 2 will expand to ~18 variants
 * covering all journey failure states via a single typed component.
 */

import { Wifi, WifiOff, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export type RecoveryVariant =
  | 'reconnecting'
  | 'network_lost'
  | 'agent_unresponsive'
  | 'backgrounded'

type VariantConfig = {
  icon: LucideIcon
  title: string
  body: string
  primary?: string
  secondary?: string
}

const VARIANTS: Record<RecoveryVariant, VariantConfig> = {
  reconnecting: {
    icon: Wifi,
    title: 'Reconectando...',
    body: 'Estamos reestableciendo tu conexion. Tu entrevista esta guardada.',
    primary: 'Seguir intentando',
    secondary: 'Terminar y guardar',
  },
  network_lost: {
    icon: WifiOff,
    title: 'Perdimos la conexion',
    body: 'No pudimos reconectar. Tus respuestas hasta este momento estan guardadas.',
    primary: 'Reintentar',
    secondary: 'Terminar y guardar',
  },
  agent_unresponsive: {
    icon: AlertCircle,
    title: 'El entrevistador se quedo callado',
    body: 'Estamos intentando reconectar con el asistente.',
    primary: 'Reintentar',
    secondary: 'Terminar y guardar',
  },
  backgrounded: {
    icon: Eye,
    title: 'Vuelve a esta pestana',
    body: 'Tu entrevista esta en pausa. Esta pestana debe permanecer visible para que el audio funcione.',
  },
}

type RecoveryCardProps = {
  variant: RecoveryVariant
  onPrimary?: () => void
  onSecondary?: () => void
}

export function RecoveryCard({ variant, onPrimary, onSecondary }: RecoveryCardProps) {
  const config = VARIANTS[variant]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
      aria-describedby="recovery-body"
    >
      <div className="max-w-[440px] w-full bg-card border border-border rounded-xl p-6 md:p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <h2
          id="recovery-title"
          className="text-xl font-semibold text-foreground mb-2"
        >
          {config.title}
        </h2>

        <p
          id="recovery-body"
          className="text-sm text-muted-foreground mb-6"
        >
          {config.body}
        </p>

        <div className="flex flex-col gap-2">
          {config.primary && onPrimary && (
            <Button onClick={onPrimary} className="w-full">
              {config.primary}
            </Button>
          )}
          {config.secondary && onSecondary && (
            <Button variant="ghost" onClick={onSecondary} className="w-full">
              {config.secondary}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
