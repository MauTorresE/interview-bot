import { z } from 'zod'

export const createCampaignSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  description: z.string().max(500).optional(),
  language: z.enum(['es-419', 'es-ES']).default('es-419'),
  duration_target_minutes: z.enum(['10', '15', '30']).default('15').transform(Number),
})

export const researchBriefSchema = z.object({
  research_goals: z.string().max(5000),
  critical_data_points: z.string().max(5000),
  critical_paths: z.array(z.object({
    trigger: z.string().min(1).max(500),
    exploration: z.string().min(1).max(500),
  })).max(10).default([]),
  context_background: z.string().max(5000),
  tone_approach: z.string().max(3000),
})

export const addRespondentSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email inválido'),
  notes: z.string().max(500).optional(),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type ResearchBriefInput = z.infer<typeof researchBriefSchema>
export type ResearchBriefOutput = z.output<typeof researchBriefSchema>
export type AddRespondentInput = z.infer<typeof addRespondentSchema>
