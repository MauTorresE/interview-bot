'use client'

import { useState } from 'react'
import { ConsentForm } from './consent-form'
import { LobbyScreen } from './lobby-screen'
import { InterviewRoom } from './interview-room'

type FlowPhase = 'consent' | 'lobby' | 'interview' | 'completion'

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
}

type CompletionData = {
  duration: number
  topicsCount: number
}

export function InterviewFlowWrapper({ inviteToken, tokenType, campaignName }: Props) {
  const [phase, setPhase] = useState<FlowPhase>('consent')
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)

  function handleInterviewReady(data: InterviewSession) {
    setSession(data)
    setPhase('lobby')
  }

  function handleInterviewEnd(data: CompletionData) {
    setCompletionData(data)
    setPhase('completion')
  }

  // 300ms fade transitions per D-28
  return (
    <div className="min-h-dvh flex items-center justify-center">
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
            onStart={() => setPhase('interview')}
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
          {/* Completion card placeholder -- implemented in Plan 04 */}
          <div className="text-center text-muted-foreground max-w-[480px]">
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
