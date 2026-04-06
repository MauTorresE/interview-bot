'use client'

import { Badge } from '@/components/ui/badge'
import {
  CAMPAIGN_STATUS_LABELS,
  RESPONDENT_STATUS_LABELS,
  type CampaignStatus,
  type RespondentStatus,
} from '@/lib/constants/campaign'

const campaignStatusStyles: Record<CampaignStatus, string> = {
  draft: 'bg-[hsl(0_0%_15%)] text-[#a1a1aa] border-[#262626]',
  active: 'bg-[hsl(142_71%_45%/0.12)] text-[#4ade80] border-[hsl(142_71%_45%/0.25)]',
  paused: 'bg-[hsl(38_92%_50%/0.12)] text-[#fbbf24] border-[hsl(38_92%_50%/0.25)]',
  completed: 'bg-[hsl(239_84%_67%/0.12)] text-[#818cf8] border-[hsl(239_84%_67%/0.25)]',
  archived: 'bg-[hsl(0_0%_15%)] text-[#a1a1aa] border-[#262626]',
}

const respondentStatusStyles: Record<RespondentStatus, string> = {
  invited: 'bg-[hsl(0_0%_15%)] text-[#a1a1aa] border-[#262626]',
  in_progress: 'bg-[hsl(38_92%_50%/0.12)] text-[#fbbf24] border-[hsl(38_92%_50%/0.25)]',
  completed: 'bg-[hsl(142_71%_45%/0.12)] text-[#4ade80] border-[hsl(142_71%_45%/0.25)]',
  dropped: 'bg-[hsl(0_84%_60%/0.12)] text-[#f87171] border-[hsl(0_84%_60%/0.25)]',
}

type StatusBadgeProps = {
  status: string
  variant?: 'campaign' | 'respondent'
}

export function StatusBadge({ status, variant = 'campaign' }: StatusBadgeProps) {
  if (variant === 'respondent') {
    const s = status as RespondentStatus
    return (
      <Badge
        variant="outline"
        className={`text-xs font-semibold ${respondentStatusStyles[s] ?? ''}`}
      >
        {RESPONDENT_STATUS_LABELS[s] ?? status}
      </Badge>
    )
  }

  const s = status as CampaignStatus
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold ${campaignStatusStyles[s] ?? ''}`}
    >
      {CAMPAIGN_STATUS_LABELS[s] ?? status}
    </Badge>
  )
}
