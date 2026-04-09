'use client'

import { useState, useEffect } from 'react'
import { ConsentForm } from './consent-form'
import { LobbyScreen } from './lobby-screen'
import { InterviewRoom } from './interview-room'
import { Loader2 } from 'lucide-react'

type FlowPhase = 'loading' | 'consent' | 'lobby' | 'interview' | 'completion' | 'rejoining'

export type InterviewSession = {
  token: string
  wsUrl: string
  interviewId: string
  campaignInfo: {
    duration: number      // minutes
    personaName: string
  }
}

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

  // Start with 'loading' to check sessionStorage on client side before showing anything
  const [phase, setPhase] = useState<FlowPhase>(activeInterviewId ? 'rejoining' : 'loading' as FlowPhase)
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)

  // On mount: check sessionStorage for saved session (handles refresh for reusable links)
  useEffect(() => {
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
    // Clear session storage — interview is done
    try { sessionStorage.removeItem(storageKey) } catch { /* ignore */ }
    setCompletionData(data)
    setPhase('completion')
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
            onInterviewEnd={handleInterviewEnd}
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
