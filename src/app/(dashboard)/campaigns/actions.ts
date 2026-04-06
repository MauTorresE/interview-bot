'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createCampaignSchema } from '@/lib/validations/campaign'
import { revalidatePath } from 'next/cache'

type ActionResult = {
  success?: boolean
  error?: string
  data?: { id: string }
}

export async function createCampaign(input: {
  name: string
  description?: string
  language?: string
  duration_target_minutes?: string
}): Promise<ActionResult> {
  const parsed = createCampaignSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Datos de campana invalidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const orgId = user.app_metadata?.org_id
  if (!orgId) return { error: 'Sin organizacion activa.' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      language: parsed.data.language,
      duration_target_minutes: parsed.data.duration_target_minutes,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !campaign) {
    return { error: 'No se pudo crear la campana. Intenta de nuevo.' }
  }

  // Create blank research brief for the new campaign
  await admin
    .from('research_briefs')
    .insert({
      campaign_id: campaign.id,
      org_id: orgId,
      brief_data: {},
    })

  revalidatePath('/campaigns')
  return { success: true, data: { id: campaign.id } }
}
