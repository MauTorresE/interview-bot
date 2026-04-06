'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryTab } from '@/components/campaigns/summary-tab'
import { BriefTab } from './brief-tab'
import { RespondentsTab } from './respondents-tab'
import { ConfigTab } from './config-tab'
import type { ResearchBriefOutput } from '@/lib/validations/campaign'

type Respondent = {
  id: string
  name: string
  email: string | null
  notes: string | null
  invite_token: string
  status: string
  interview_date: string | null
  created_at: string
}

type Campaign = {
  id: string
  name: string
  description: string | null
  status: string
  language: string
  duration_target_minutes: number
  voice_provider: string | null
  voice_id: string | null
  interviewer_style: string | null
  reusable_invite_token: string | null
  reusable_invite_enabled: boolean
  created_at: string
}

type CampaignTabsProps = {
  campaign: Campaign
  brief: { brief_data: ResearchBriefOutput } | null
  respondents: Respondent[]
}

export function CampaignTabs({
  campaign,
  brief,
  respondents,
}: CampaignTabsProps) {
  return (
    <Tabs defaultValue="resumen" className="w-full">
      <TabsList>
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="guia">Guia de investigacion</TabsTrigger>
        <TabsTrigger value="participantes">
          Participantes{respondents.length > 0 ? ` (${respondents.length})` : ''}
        </TabsTrigger>
        <TabsTrigger value="configuracion">Configuracion</TabsTrigger>
      </TabsList>

      <div className="pt-8">
        <TabsContent value="resumen">
          <SummaryTab campaign={campaign} respondents={respondents} />
        </TabsContent>

        <TabsContent value="guia">
          <BriefTab campaignId={campaign.id} brief={brief} />
        </TabsContent>

        <TabsContent value="participantes">
          <RespondentsTab
            campaignId={campaign.id}
            respondents={respondents}
            reusableInviteToken={campaign.reusable_invite_token}
            reusableInviteEnabled={campaign.reusable_invite_enabled}
          />
        </TabsContent>

        <TabsContent value="configuracion">
          <ConfigTab campaign={campaign} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
