'use client'

import { Badge } from '@/components/ui/badge'
import {
  CAMPAIGN_STATUS_LABELS,
  RESPONDENT_STATUS_LABELS,
  type CampaignStatus,
  type RespondentStatus,
} from '@/lib/constants/campaign'

const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'hsl(0 0% 15%)', text: '#a1a1aa', border: '#262626' },
  active: { bg: 'hsl(142 71% 45% / 0.12)', text: '#4ade80', border: 'hsl(142 71% 45% / 0.25)' },
  paused: { bg: 'hsl(38 92% 50% / 0.12)', text: '#fbbf24', border: 'hsl(38 92% 50% / 0.25)' },
  completed: { bg: 'hsl(239 84% 67% / 0.12)', text: '#818cf8', border: 'hsl(239 84% 67% / 0.25)' },
  archived: { bg: 'hsl(0 0% 15%)', text: '#a1a1aa', border: '#262626' },
}

const RESPONDENT_STATUS_COLORS: Record<RespondentStatus, { bg: string; text: string; border: string }> = {
  invited: { bg: 'hsl(0 0% 15%)', text: '#a1a1aa', border: '#262626' },
  in_progress: { bg: 'hsl(38 92% 50% / 0.12)', text: '#fbbf24', border: 'hsl(38 92% 50% / 0.25)' },
  completed: { bg: 'hsl(142 71% 45% / 0.12)', text: '#4ade80', border: 'hsl(142 71% 45% / 0.25)' },
  dropped: { bg: 'hsl(0 84% 60% / 0.12)', text: '#f87171', border: 'hsl(0 84% 60% / 0.25)' },
}

type StatusBadgeProps = {
  status: string
  variant?: 'campaign' | 'respondent'
}

export function StatusBadge({ status, variant = 'campaign' }: StatusBadgeProps) {
  const colors = variant === 'campaign'
    ? CAMPAIGN_STATUS_COLORS[status as CampaignStatus]
    : RESPONDENT_STATUS_COLORS[status as RespondentStatus]

  const label = variant === 'campaign'
    ? CAMPAIGN_STATUS_LABELS[status as CampaignStatus]
    : RESPONDENT_STATUS_LABELS[status as RespondentStatus]

  if (!colors || !label) {
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <Badge
      className="text-xs font-semibold"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {label}
    </Badge>
  )
}
