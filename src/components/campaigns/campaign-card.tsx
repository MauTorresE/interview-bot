'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/campaigns/status-badge'
import { LANGUAGES } from '@/lib/constants/campaign'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale/es'

export type CampaignCardData = {
  id: string
  name: string
  description: string | null
  status: string
  language: string
  duration_target_minutes: number
  created_at: string
  respondent_count: number
  completed_count: number
}

type CampaignCardProps = {
  campaign: CampaignCardData
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const router = useRouter()

  const progressValue =
    campaign.respondent_count > 0
      ? (campaign.completed_count / campaign.respondent_count) * 100
      : 0

  const languageLabel =
    LANGUAGES.find((l) => l.value === campaign.language)?.label ?? campaign.language

  return (
    <Card
      className="relative cursor-pointer hover:border-primary/30 transition-colors duration-150"
      onClick={() => router.push(`/campaigns/${campaign.id}`)}
    >
      <CardContent className="p-4">
        <div className="absolute top-4 right-4">
          <StatusBadge status={campaign.status} variant="campaign" />
        </div>

        <h3 className="text-sm font-semibold text-foreground pr-20">
          {campaign.name}
        </h3>

        {campaign.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        )}

        <div className="mt-3">
          <Progress value={progressValue} />
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.completed_count}/{campaign.respondent_count} entrevistas
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{languageLabel}</span>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(campaign.created_at), 'd MMM yyyy', { locale: es })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
