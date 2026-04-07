'use client'

import { useState } from 'react'
import { ConsentForm } from './consent-form'

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

export function InterviewFlowWrapper({ inviteToken, tokenType, campaignName }: Props) {
  const [phase, setPhase] = useState<FlowPhase>('consent')
  const [session, setSession] = useState<InterviewSession | null>(null)

  function handleInterviewReady(data: InterviewSession) {
    setSession(data)
    setPhase('lobby') // Will render LobbyScreen in Plan 03
  }

  // 300ms fade transitions per D-28
  return (
    <div className="transition-opacity duration-300 ease-out">
      {phase === 'consent' && (
        <ConsentForm
          token={inviteToken}
          tokenType={tokenType}
          campaignName={campaignName}
          onInterviewReady={handleInterviewReady}
        />
      )}
      {phase === 'lobby' && session && (
        <div className="text-center text-muted-foreground">
          Lobby placeholder -- implemented in Plan 03
        </div>
      )}
      {phase === 'interview' && session && (
        <div className="text-center text-muted-foreground">
          Interview room placeholder -- implemented in Plan 03
        </div>
      )}
      {phase === 'completion' && (
        <div className="text-center text-muted-foreground">
          Completion placeholder -- implemented in Plan 04
        </div>
      )}
    </div>
  )
}
