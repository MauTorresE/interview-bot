import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignTabs } from '@/components/campaigns/campaign-tabs'
import { CampaignActionsMenu } from '@/components/campaigns/campaign-actions-menu'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign) {
    notFound()
  }

  const { data: brief } = await supabase
    .from('research_briefs')
    .select('*')
    .eq('campaign_id', id)
    .single()

  const { data: respondents } = await supabase
    .from('respondents')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/campaigns" />}>
                Campanas
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{campaign.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <CampaignActionsMenu campaignId={campaign.id} campaignName={campaign.name} />
      </div>

      <CampaignTabs
        campaign={campaign}
        brief={brief ?? null}
        respondents={respondents ?? []}
      />
    </div>
  )
}
