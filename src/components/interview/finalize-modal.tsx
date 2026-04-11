'use client'

/**
 * FinalizeModal — Wave 1.4
 *
 * Shown when the agent has delivered the closing summary and is ready for
 * the user to explicitly confirm the end of the interview. Non-dismissable
 * by design: the only way out is the primary button (or the 90s auto-click
 * fallback wired in interview-room.tsx).
 *
 * TTS-awareness (Wave 1.3 + W-12): while the agent is still speaking, the
 * button is replaced with a "Esperando al entrevistador..." state. Clicking
 * during the speaking state queues the confirmation, which auto-fires once
 * the agent goes idle. This prevents clipping the goodbye audio.
 *
 * Accessibility: focus traps to the Finalizar button on mount, aria-live
 * region announces the summary for screen readers, Escape is intentionally
 * blocked (Wave 2+ will add announcement).
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

type AgentState = 'disconnected' | 'connecting' | 'initializing' | 'listening' | 'thinking' | 'speaking'

type FinalizeModalProps = {
  summary: string
  agentState: AgentState
  onConfirm: () => void
  /** True while the confirm request is in flight (button shows spinner). */
  confirming?: boolean
}

export function FinalizeModal({ summary, agentState, onConfirm, confirming = false }: FinalizeModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [pendingConfirm, setPendingConfirm] = useState(false)

  const isAgentSpeaking = agentState === 'speaking' || agentState === 'thinking'

  // Focus the primary button on mount (after the fade-in completes)
  useEffect(() => {
    const id = window.setTimeout(() => {
      buttonRef.current?.focus()
    }, 320)
    return () => window.clearTimeout(id)
  }, [])

  // If user clicked while agent was still speaking, auto-fire when agent goes silent
  useEffect(() => {
    if (pendingConfirm && !isAgentSpeaking) {
      setPendingConfirm(false)
      onConfirm()
    }
  }, [pendingConfirm, isAgentSpeaking, onConfirm])

  // Block Escape key — this modal is intentionally non-dismissable
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [])

  function handleClick() {
    if (confirming || pendingConfirm) return
    if (isAgentSpeaking) {
      // Queue the confirmation — it'll fire via the useEffect above
      // once the agent transitions out of speaking/thinking
      setPendingConfirm(true)
      return
    }
    onConfirm()
  }

  const buttonLabel = (() => {
    if (confirming) return 'Finalizando...'
    if (pendingConfirm) return 'Esperando al entrevistador...'
    if (isAgentSpeaking) return 'Esperando al entrevistador...'
    return 'Finalizar entrevista'
  })()

  const buttonDisabled = confirming || pendingConfirm || isAgentSpeaking

  return (
    <div
      className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-modal-title"
      aria-describedby="finalize-modal-summary"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-[480px] w-full bg-card border border-border rounded-xl p-6 md:p-8 shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300">
        {/* Sparkle icon hero */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-7 text-primary" aria-hidden="true" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="finalize-modal-title"
          className="text-xl md:text-2xl font-semibold text-center mb-4 text-foreground"
        >
          ¡Gracias por tu tiempo!
        </h2>

        {/* Summary — live region so screen readers announce it after the title */}
        <div
          id="finalize-modal-summary"
          aria-live="polite"
          className="text-sm md:text-base text-muted-foreground text-center leading-relaxed mb-6 whitespace-pre-wrap"
        >
          {summary}
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground/70 text-center mb-6">
          Cuando estés listo, presiona el botón para finalizar la entrevista.
        </p>

        {/* Primary action */}
        <Button
          ref={buttonRef}
          onClick={handleClick}
          disabled={buttonDisabled}
          aria-describedby="finalize-modal-summary"
          className="w-full h-12 text-base"
          size="lg"
        >
          {(confirming || pendingConfirm) && (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
