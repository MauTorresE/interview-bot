import { describe, it, expect } from 'vitest'
import { createCampaignSchema, researchBriefSchema, addRespondentSchema } from '@/lib/validations/campaign'

describe('createCampaignSchema', () => {
  it('accepts valid campaign data', () => {
    const result = createCampaignSchema.safeParse({
      name: 'Test Campaign',
      language: 'es-419',
      duration_target_minutes: '15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 chars', () => {
    const result = createCampaignSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createCampaignSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('defaults language to es-419', () => {
    const result = createCampaignSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.language).toBe('es-419')
  })

  it('defaults duration to 15', () => {
    const result = createCampaignSchema.safeParse({ name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.duration_target_minutes).toBe(15)
  })

  it('rejects invalid language', () => {
    const result = createCampaignSchema.safeParse({ name: 'Test', language: 'en-US' })
    expect(result.success).toBe(false)
  })
})

describe('researchBriefSchema', () => {
  it('accepts full brief data', () => {
    const result = researchBriefSchema.safeParse({
      research_goals: 'Learn about user needs',
      critical_data_points: 'Pain points, workflows',
      critical_paths: [{ trigger: 'mentions pricing', exploration: 'explore budget constraints' }],
      context_background: 'SaaS company',
      tone_approach: 'Professional but warm',
    })
    expect(result.success).toBe(true)
  })

  it('rejects research_goals longer than 5000 chars', () => {
    const result = researchBriefSchema.safeParse({
      research_goals: 'A'.repeat(5001),
      critical_data_points: 'test',
      context_background: 'test',
      tone_approach: 'test',
    })
    expect(result.success).toBe(false)
  })

  it('defaults critical_paths to empty array', () => {
    const result = researchBriefSchema.safeParse({
      research_goals: 'test',
      critical_data_points: 'test',
      context_background: 'test',
      tone_approach: 'test',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.critical_paths).toEqual([])
  })

  it('rejects more than 10 critical paths', () => {
    const paths = Array.from({ length: 11 }, (_, i) => ({
      trigger: `trigger ${i}`,
      exploration: `explore ${i}`,
    }))
    const result = researchBriefSchema.safeParse({
      research_goals: 'test',
      critical_data_points: 'test',
      critical_paths: paths,
      context_background: 'test',
      tone_approach: 'test',
    })
    expect(result.success).toBe(false)
  })
})

describe('addRespondentSchema', () => {
  it('accepts valid respondent data', () => {
    const result = addRespondentSchema.safeParse({ name: 'Ana Garcia', email: 'ana@test.com' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = addRespondentSchema.safeParse({ name: '', email: 'ana@test.com' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = addRespondentSchema.safeParse({ name: 'Ana', email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('allows optional notes', () => {
    const result = addRespondentSchema.safeParse({ name: 'Ana', email: 'ana@test.com', notes: 'VIP customer' })
    expect(result.success).toBe(true)
  })
})
