import { FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CampaignGrid } from '@/components/campaigns/campaign-grid'
import { CreateCampaignDialog } from '@/components/campaigns/create-campaign-dialog'
import type { CampaignCardData } from '@/components/campaigns/campaign-card'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description, status, language, duration_target_minutes, created_at')
    .order('created_at', { ascending: false })

  // Fetch respondent counts per campaign
  const { data: respondents } = await supabase
    .from('respondents')
    .select('campaign_id, status')

  // Build count maps
  const respondentCounts: Record<string, number> = {}
  const completedCounts: Record<string, number> = {}

  if (respondents) {
    for (const r of respondents) {
      respondentCounts[r.campaign_id] = (respondentCounts[r.campaign_id] ?? 0) + 1
      if (r.status === 'completed') {
        completedCounts[r.campaign_id] = (completedCounts[r.campaign_id] ?? 0) + 1
      }
    }
  }

  const campaignData: CampaignCardData[] = (campaigns ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    status: c.status,
    language: c.language,
    duration_target_minutes: c.duration_target_minutes,
    created_at: c.created_at,
    respondent_count: respondentCounts[c.id] ?? 0,
    completed_count: completedCounts[c.id] ?? 0,
  }))

  const hasCampaigns = campaignData.length > 0

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-foreground">Campañas</h1>
        {hasCampaigns && <CreateCampaignDialog />}
      </div>

      {hasCampaigns ? (
        <CampaignGrid campaigns={campaignData} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <FolderOpen className="size-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Sin campañas aún
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Crea tu primera campaña de entrevistas para comenzar a recopilar
              insights.
            </p>
          </div>
          <div className="mt-2">
            <CreateCampaignDialog />
          </div>
        </div>
      )}
    </div>
  )
}
