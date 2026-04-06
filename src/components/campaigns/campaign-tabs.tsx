'use client'

<<<<<<< HEAD
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BriefTab } from './brief-tab'
import { RespondentsTab } from './respondents-tab'
import type { ResearchBriefOutput } from '@/lib/validations/campaign'
=======
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SummaryTab } from '@/components/campaigns/summary-tab'
>>>>>>> worktree-agent-a2943027

type Respondent = {
  id: string
  name: string
<<<<<<< HEAD
  email: string | null
  notes: string | null
  invite_token: string
  status: string
  interview_date: string | null
=======
  email: string
  status: string
>>>>>>> worktree-agent-a2943027
  created_at: string
}

type Campaign = {
  id: string
  name: string
<<<<<<< HEAD
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
=======
  description: string | null
  status: string
  language: string
  duration_target_minutes: number
  voice_id: string | null
  interviewer_style: string | null
  created_at: string
}

type ResearchBrief = {
  id: string
  brief_data: Record<string, unknown>
} | null

type CampaignTabsProps = {
  campaign: Campaign
  brief: ResearchBrief
  respondents: Respondent[]
}

export function CampaignTabs({ campaign, brief, respondents }: CampaignTabsProps) {
  return (
    <Tabs defaultValue="resumen">
      <TabsList variant="line" className="w-full justify-start border-b border-border rounded-none">
        <TabsTrigger value="resumen">
          Resumen
        </TabsTrigger>
        <TabsTrigger value="guia">
          Guia de investigacion
        </TabsTrigger>
        <TabsTrigger value="participantes">
          Participantes
        </TabsTrigger>
        <TabsTrigger value="configuracion">
          Configuracion
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumen" className="pt-8">
        <SummaryTab campaign={campaign} respondents={respondents} />
      </TabsContent>

      <TabsContent value="guia" className="pt-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Guia sin completar</p>
        </div>
      </TabsContent>

      <TabsContent value="participantes" className="pt-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Sin participantes aun</p>
        </div>
      </TabsContent>

      <TabsContent value="configuracion" className="pt-8">
        <div>
          <h2 className="text-lg font-semibold">Configuracion</h2>
        </div>
      </TabsContent>
>>>>>>> worktree-agent-a2943027
    </Tabs>
  )
}
