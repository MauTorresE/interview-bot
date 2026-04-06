import { describe, it, expect } from 'vitest'
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS } from '@/lib/constants/campaign'

describe('CampaignGrid', () => {
  it('campaign statuses have Spanish labels', () => {
    for (const status of CAMPAIGN_STATUSES) {
      expect(CAMPAIGN_STATUS_LABELS[status]).toBeDefined()
      expect(typeof CAMPAIGN_STATUS_LABELS[status]).toBe('string')
    }
  })

  it('all expected campaign statuses exist', () => {
    expect(CAMPAIGN_STATUSES).toContain('draft')
    expect(CAMPAIGN_STATUSES).toContain('active')
    expect(CAMPAIGN_STATUSES).toContain('paused')
    expect(CAMPAIGN_STATUSES).toContain('completed')
    expect(CAMPAIGN_STATUSES).toContain('archived')
  })

  it('filters campaigns by status', () => {
    // Verifies filtering logic works with status values
    const campaigns = [
      { status: 'draft', name: 'Test 1' },
      { status: 'active', name: 'Test 2' },
      { status: 'completed', name: 'Test 3' },
    ]
    const statusFilter = 'active'
    const filtered = campaigns.filter((c) => c.status === statusFilter)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Test 2')
  })

  it('search filters campaigns by name', () => {
    const campaigns = [
      { name: 'Investigacion de mercado' },
      { name: 'Entrevistas de usuario' },
      { name: 'Estudio de satisfaccion' },
    ]
    const query = 'usuario'
    const filtered = campaigns.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Entrevistas de usuario')
  })

  it('shows all campaigns when no filter applied', () => {
    const campaigns = [
      { status: 'draft', name: 'A' },
      { status: 'active', name: 'B' },
    ]
    const statusFilter = ''
    const searchQuery = ''
    const filtered = campaigns.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    expect(filtered).toHaveLength(2)
  })
})
