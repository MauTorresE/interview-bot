'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SummaryTab } from '@/components/campaigns/summary-tab'

type Respondent = {
  id: string
  name: string
  email: string
  status: string
  created_at: string
}

type Campaign = {
  id: string
  name: string
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
    </Tabs>
  )
}
