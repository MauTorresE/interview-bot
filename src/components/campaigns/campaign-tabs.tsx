'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BriefTab } from './brief-tab'
import { RespondentsTab } from './respondents-tab'
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
  status: string
  reusable_invite_token: string | null
  reusable_invite_enabled: boolean
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
          <div className="text-sm text-muted-foreground">
            Resumen de la campana (Plan 02)
          </div>
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
          <div className="text-sm text-muted-foreground">
            Configuracion de la campana (Plan 04)
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
