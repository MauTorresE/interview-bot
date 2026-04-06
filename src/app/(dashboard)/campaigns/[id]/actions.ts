'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { researchBriefSchema, addRespondentSchema } from '@/lib/validations/campaign'
import type { ResearchBriefInput, AddRespondentInput } from '@/lib/validations/campaign'
import { revalidatePath } from 'next/cache'

type ActionResult = {
  success?: boolean
  error?: string
}

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' as const }

  const orgId = user.app_metadata?.org_id
  if (!orgId) return { error: 'Sin organización activa.' as const }

  const admin = createAdminClient()

  return { user, orgId, admin }
}

export async function saveBrief(
  campaignId: string,
  input: ResearchBriefInput
): Promise<ActionResult> {
  const parsed = researchBriefSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos de guía inválidos.' }
  }

  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  const { orgId, admin } = ctx

  const { error } = await admin
    .from('research_briefs')
    .upsert(
      {
        campaign_id: campaignId,
        org_id: orgId,
        brief_data: parsed.data,
      },
      { onConflict: 'campaign_id' }
    )

  if (error) {
    return { error: 'No se pudo guardar la guía. Intenta de nuevo.' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { success: true }
}

export async function addRespondent(
  campaignId: string,
  input: AddRespondentInput
): Promise<ActionResult> {
  const parsed = addRespondentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos del participante inválidos.' }
  }

  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  const { orgId, admin } = ctx

  const { error } = await admin
    .from('respondents')
    .insert({
      campaign_id: campaignId,
      org_id: orgId,
      name: parsed.data.name,
      email: parsed.data.email,
      notes: parsed.data.notes ?? null,
    })

  if (error) {
    return { error: 'No se pudo agregar al participante. Verifica el email e intenta de nuevo.' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { success: true }
}

export async function deleteRespondent(
  campaignId: string,
  respondentId: string
): Promise<ActionResult> {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  const { orgId, admin } = ctx

  const { error } = await admin
    .from('respondents')
    .delete()
    .eq('id', respondentId)
    .eq('org_id', orgId)

  if (error) {
    return { error: 'No se pudo eliminar al participante. Intenta de nuevo.' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { success: true }
}

export async function sendReminder(
  campaignId: string,
  respondentId: string
): Promise<ActionResult> {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }

  // TODO: Wire up email service (Resend/Supabase Edge Functions) in future phase
  console.log(`[STUB] Reminder sent for respondent ${respondentId} in campaign ${campaignId}`)

  return { success: true }
}

export async function archiveCampaign(
  campaignId: string
): Promise<ActionResult> {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  const { orgId, admin } = ctx

  const { error } = await admin
    .from('campaigns')
    .update({ status: 'archived' })
    .eq('id', campaignId)
    .eq('org_id', orgId)

  if (error) {
    return { error: 'No se pudo archivar la campaña. Intenta de nuevo.' }
  }

  revalidatePath('/campaigns')
  return { success: true }
}

export async function updateCampaignConfig(
  campaignId: string,
  input: Partial<{
    name: string
    description: string
    language: string
    duration_target_minutes: number
    voice_provider: string
    voice_id: string
    interviewer_style: string
    reusable_invite_enabled: boolean
  }>
): Promise<ActionResult> {
  const ctx = await getAuthContext()
  if ('error' in ctx) return { error: ctx.error }
  const { orgId, admin } = ctx

  const { error } = await admin
    .from('campaigns')
    .update(input)
    .eq('id', campaignId)
    .eq('org_id', orgId)

  if (error) {
    return { error: 'No se pudo actualizar la configuración. Intenta de nuevo.' }
  }

  revalidatePath(`/campaigns/${campaignId}`)
  return { success: true }
}
