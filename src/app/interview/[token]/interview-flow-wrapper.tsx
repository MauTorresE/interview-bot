'use client'

import { useState, useEffect } from 'react'
import { ConsentForm } from './consent-form'
import { LobbyScreen } from './lobby-screen'
import { InterviewRoom, type PersistedFinalState } from './interview-room'
import { FinalizeModal } from '@/components/interview/finalize-modal'
import { useTabLock } from '@/hooks/use-tab-lock'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

type FlowPhase =
  | 'loading'
  | 'consent'
  | 'lobby'
  | 'interview'
  | 'mic_handoff'  // Brief transition: lobby unmounted, LiveKitRoom not yet mounted
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

  // Wave 4.1: multi-tab lock prevents two tabs from sending audio to the
  // same LiveKit room simultaneously (causes echo + duplicate transcripts)
  const { status: tabLockStatus, takeover: takeoverTab } = useTabLock(inviteToken)

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
  // Wave 3.1: restored modal confirm now fires REST fallback to ensure DB
  // is marked completed even when there's no live LiveKit room to send
  // user_confirmed_end through the data channel.
  function handleRestoredFinalConfirm() {
    setRestoreConfirming(true)
    try {
      sessionStorage.removeItem(finalStateKey)
      sessionStorage.removeItem(storageKey)
    } catch { /* ignore */ }

    // REST fallback — mark completed in DB (idempotent, safe if already done)
    const savedSession = (() => {
      try {
        const s = sessionStorage.getItem(storageKey)
        return s ? JSON.parse(s) : null
      } catch { return null }
    })()
    const interviewId = savedSession?.interviewId || session?.interviewId
    if (interviewId) {
      fetch(`/api/interviews/${interviewId}/confirm-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 0 }),
      }).catch(() => {})
    }

    // Brief pause for the spinner to render before the phase transition
    setTimeout(() => {
      setCompletionData({ duration: 0, topicsCount: 0 })
      setPhase('completion')
    }, 400)
  }

  // 300ms fade transitions per D-28
  return (
    <div className="min-h-dvh flex items-center justify-center">
      {/* Wave 4.1: multi-tab lock — show blocker if another tab has the interview */}
      {tabLockStatus === 'locked_by_other' && (
        <div className="animate-in fade-in duration-300 ease-out w-full flex items-center justify-center px-4">
          <div className="max-w-[440px] w-full text-center p-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Info className="size-6 text-amber-500/80" aria-hidden="true" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ya estas en otra pestana
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tienes esta entrevista abierta en otra ventana. Para evitar conflictos de audio,
              solo una puede estar activa a la vez.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.close()}>
                Cerrar esta pestana
              </Button>
              <Button onClick={takeoverTab}>
                Tomar el control aqui
              </Button>
            </div>
          </div>
        </div>
      )}
      {tabLockStatus !== 'locked_by_other' && phase === 'loading' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      {tabLockStatus !== 'locked_by_other' && phase === 'rejoining' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Reconectando a tu entrevista...</p>
        </div>
      )}
      {tabLockStatus !== 'locked_by_other' && phase === 'consent' && (
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
      {tabLockStatus !== 'locked_by_other' && phase === 'lobby' && session && (
        <div
          key="lobby"
          className="animate-in fade-in duration-300 ease-out w-full"
        >
          <LobbyScreen
            session={session}
            campaignName={campaignName}
            onStart={() => {
              // Transition to a blank phase — lobby unmounts and fully releases
              // the mic. After 1.5s, mount LiveKitRoom with audio={true}.
              // This two-phase approach avoids the NotReadableError on Windows
              // where AudioContext.close() + track.stop() don't release the
              // device handle fast enough for LiveKit's getUserMedia.
              setPhase('mic_handoff')
              setTimeout(() => setPhase('interview'), 1500)
            }}
          />
        </div>
      )}
      {phase === 'mic_handoff' && (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Conectando...</p>
        </div>
      )}
      {tabLockStatus !== 'locked_by_other' && phase === 'interview' && session && (
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
