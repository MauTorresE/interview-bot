'use client'

import { useState, useEffect } from 'react'
import { ConsentForm } from './consent-form'
import { LobbyScreen } from './lobby-screen'
import { InterviewRoom, type PersistedFinalState } from './interview-room'
import { FinalizeModal } from '@/components/interview/finalize-modal'
import { Loader2 } from 'lucide-react'

type FlowPhase =
  | 'loading'
  | 'consent'
  | 'lobby'
  | 'interview'
  | 'completion'
  | 'rejoining'
  | 'finalizing_restore' // Wave 2.3: modal restored from sessionStorage after refresh

export type InterviewSession = {
  token: string
  wsUrl: string
  interviewId: string
  respondentId?: string  // Wave 2.3: required for reusable-link rejoin flow (also fixes pre-existing consent-form.tsx TS errors)
  campaignInfo: {
    duration: number      // minutes
    personaName: string
  }
}

// Wave 2.3: ten-minute TTL for persisted modal state. Older than this and
// we assume the user abandoned the tab and we'd rather dump them back to
// consent than restore a stale modal.
const FINALSTATE_TTL_MS = 10 * 60 * 1000

type Props = {
  inviteToken: string
  tokenType: 'respondent' | 'campaign'
  campaignName: string
  activeInterviewId?: string | null
  respondentId?: string | null
}

type CompletionData = {
  duration: number
  topicsCount: number
}

export function InterviewFlowWrapper({
  inviteToken,
  tokenType,
  campaignName,
  activeInterviewId,
  respondentId,
}: Props) {
  const storageKey = `interview-session-${inviteToken}`
  const finalStateKey = `interview-finalstate-${inviteToken}`

  // Start with 'loading' to check sessionStorage on client side before showing anything
  const [phase, setPhase] = useState<FlowPhase>(activeInterviewId ? 'rejoining' : 'loading' as FlowPhase)
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)

  // Wave 2.3: restored finalization state from sessionStorage. When present,
  // we render a standalone <FinalizeModal> without reconnecting to LiveKit.
  const [restoredFinal, setRestoredFinal] = useState<PersistedFinalState | null>(null)
  const [restoreConfirming, setRestoreConfirming] = useState(false)

  // On mount: check sessionStorage for saved session OR a persisted finalize modal
  useEffect(() => {
    // Wave 2.3: check for a persisted finalize state FIRST, before any other
    // branches. If the user refreshed while the modal was showing, we want
    // to restore it immediately — don't reconnect to LiveKit, don't re-run
    // consent, just show the modal again with the same summary text.
    try {
      const saved = sessionStorage.getItem(finalStateKey)
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedFinalState
        const age = Date.now() - parsed.savedAt
        if (parsed.version === 1 && age < FINALSTATE_TTL_MS) {
          setRestoredFinal(parsed)
          setPhase('finalizing_restore')
          return
        }
        // Stale — clear it and fall through to normal flow
        sessionStorage.removeItem(finalStateKey)
      }
    } catch { /* ignore */ }

    // Server-detected active interview — go straight to rejoin
    if (activeInterviewId) {
      setPhase('rejoining')
      return
    }

    // Check sessionStorage for a saved session from a previous consent in this tab
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        setPhase('rejoining')
        return
      }
    } catch { /* ignore */ }

    // No saved session — show consent
    setPhase('consent')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rejoin active interview
  useEffect(() => {
    if (phase !== 'rejoining') return

    const savedRespondentId = (() => {
      try {
        const saved = sessionStorage.getItem(storageKey)
        if (saved) return JSON.parse(saved).respondentId
      } catch { /* ignore */ }
      return respondentId
    })()

    async function rejoin() {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: inviteToken,
            ...(savedRespondentId ? { respondentId: savedRespondentId } : {}),
            rejoin: true,
          }),
        })

        if (!res.ok) {
          sessionStorage.removeItem(storageKey)
          setPhase('consent')
          return
        }

        const data = await res.json()
        const newSession = {
          token: data.token,
          wsUrl: data.wsUrl,
          interviewId: data.interviewId,
          campaignInfo: data.campaignInfo,
        }
        setSession(newSession)
        sessionStorage.setItem(storageKey, JSON.stringify({ ...newSession, respondentId: savedRespondentId }))
        setPhase('interview')
      } catch {
        sessionStorage.removeItem(storageKey)
        setPhase('consent')
      }
    }

    rejoin()
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleInterviewReady(data: InterviewSession & { respondentId?: string }) {
    setSession(data)
    // Save to sessionStorage so refresh can rejoin (especially for reusable links)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    } catch { /* ignore */ }
    setPhase('lobby')
  }

  function handleInterviewEnd(data: CompletionData) {
    // Clear session storage — interview is done (Wave 2.3: clear both keys)
    try {
      sessionStorage.removeItem(storageKey)
      sessionStorage.removeItem(finalStateKey)
    } catch { /* ignore */ }
    setCompletionData(data)
    setPhase('completion')
  }

  // Wave 2.3: user clicked Finalizar on the RESTORED modal (after refresh).
  // We don't have a live LiveKit room to tear down — the original session's
  // backend already marked the interview completed (via user_confirmed_end,
  // the 90% watchdog, or the 130% watchdog) OR is still holding the room
  // until emptyTimeout runs out. Either way, we transition the local UI to
  // the completion card with whatever data we have.
  function handleRestoredFinalConfirm() {
    setRestoreConfirming(true)
    try {
      sessionStorage.removeItem(finalStateKey)
      sessionStorage.removeItem(storageKey)
    } catch { /* ignore */ }
    // Brief pause for the spinner to render before the phase transition
    setTimeout(() => {
      setCompletionData({ duration: 0, topicsCount: 0 })
      setPhase('completion')
    }, 400)
  }

  // 300ms fade transitions per D-28
  return (
    <div className="min-h-dvh flex items-center justify-center">
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      {phase === 'rejoining' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Reconectando a tu entrevista...</p>
        </div>
      )}
      {phase === 'consent' && (
        <div
          key="consent"
          className="animate-in fade-in duration-300 ease-out w-full flex items-center justify-center px-4"
        >
          <ConsentForm
            token={inviteToken}
            tokenType={tokenType}
            campaignName={campaignName}
            onInterviewReady={handleInterviewReady}
          />
        </div>
      )}
      {phase === 'lobby' && session && (
        <div
          key="lobby"
          className="animate-in fade-in duration-300 ease-out w-full"
        >
          <LobbyScreen
            session={session}
            campaignName={campaignName}
            onStart={() => {
              // Delay to let browser fully release mic + AudioContext before LiveKitRoom grabs it
              setTimeout(() => setPhase('interview'), 1000)
            }}
          />
        </div>
      )}
      {phase === 'interview' && session && (
        <div
          key="interview"
          className="animate-in fade-in duration-300 ease-out w-full"
        >
          <InterviewRoom
            session={session}
            inviteToken={inviteToken}
            onInterviewEnd={handleInterviewEnd}
          />
        </div>
      )}
      {phase === 'finalizing_restore' && restoredFinal && (
        <div
          key="finalizing_restore"
          className="animate-in fade-in duration-300 ease-out w-full"
        >
          {/* Wave 2.3: standalone FinalizeModal rendered from restored
              sessionStorage state. No LiveKitRoom, no real-time connection.
              The user clicks Finalizar and transitions directly to the
              completion card via handleRestoredFinalConfirm. */}
          <FinalizeModal
            summary={restoredFinal.summary || 'Gracias por tu tiempo.'}
            agentState="idle"
            onConfirm={handleRestoredFinalConfirm}
            confirming={restoreConfirming}
          />
        </div>
      )}
      {phase === 'completion' && (
        <div
          key="completion"
          className="animate-in fade-in duration-300 ease-out w-full flex items-center justify-center px-4"
        >
          <div className="text-center text-muted-foreground max-w-[480px]">
            <div className="mb-6">
              <span className="text-xl font-semibold text-primary">EntrevistaAI</span>
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">
              {campaignName}
            </p>
            {completionData && (
              <div className="text-sm space-y-1">
                <p>Duracion: {Math.floor(completionData.duration / 60)} min {completionData.duration % 60} seg</p>
                <p>Temas discutidos: {completionData.topicsCount}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Gracias por tu tiempo. El investigador recibira tus insights pronto.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
