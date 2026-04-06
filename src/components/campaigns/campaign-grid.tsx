'use client'

import { useState } from 'react'
import { CampaignCard, type CampaignCardData } from '@/components/campaigns/campaign-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS } from '@/lib/constants/campaign'

type CampaignGridProps = {
  campaigns: CampaignCardData[]
}

export function CampaignGrid({ campaigns }: CampaignGridProps) {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = campaigns.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return false
    return true
  })

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val ?? '')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {CAMPAIGN_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {CAMPAIGN_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No se encontraron campanas.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}
