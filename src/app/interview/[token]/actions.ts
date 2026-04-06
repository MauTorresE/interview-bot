'use server'

import { createAdminClient } from '@/lib/supabase/admin'

function getAdmin() {
  return createAdminClient()
}

export async function validateToken(token: string): Promise<{
  valid: boolean
  type: 'respondent' | 'campaign' | null
  campaignName: string | null
  error?: string
}> {
  const admin = getAdmin()

  // Check respondents table first
  const { data: respondent, error: respError } = await admin
    .from('respondents')
    .select('id, status, campaign_id')
    .eq('invite_token', token)
    .single()

  if (respError) {
    console.error('[validateToken] respondent lookup error:', respError)
  }

  if (respondent) {
    // Fetch campaign name separately (avoids PostgREST join issues across schemas)
    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, name, status')
      .eq('id', respondent.campaign_id)
      .single()

    return {
      valid: true,
      type: 'respondent',
      campaignName: campaign?.name ?? null,
    }
  }

  // Check campaigns table for reusable invite token
  const { data: campaign, error: campError } = await admin
    .from('campaigns')
    .select('id, name, status')
    .eq('reusable_invite_token', token)
    .eq('reusable_invite_enabled', true)
    .single()

  if (campError) {
    console.error('[validateToken] campaign lookup error:', campError)
  }

  if (campaign) {
    return {
      valid: true,
      type: 'campaign',
      campaignName: campaign.name,
    }
  }

  return { valid: false, type: null, campaignName: null, error: 'invalid' }
}

export async function recordConsent(token: string): Promise<{
  success?: boolean
  error?: string
}> {
  const admin = getAdmin()

  // Look up respondent by invite_token
  const { data: respondent } = await admin
    .from('respondents')
    .select('id, status, campaign_id, campaigns(id, status)')
    .eq('invite_token', token)
    .single()

  if (!respondent) {
    return { error: 'invalid' }
  }

  // Prevent re-consent (T-02-12)
  if (respondent.status !== 'invited') {
    return { error: 'already_used' }
  }

  // Check campaign status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaign = respondent.campaigns as any
  if (campaign?.status === 'archived') {
    return { error: 'campaign_archived' }
  }

  // Update respondent with consent
  const { error } = await admin
    .from('respondents')
    .update({
      status: 'in_progress',
      consent_given_at: new Date().toISOString(),
    })
    .eq('id', respondent.id)

  if (error) {
    return { error: 'No se pudo registrar el consentimiento. Intenta de nuevo.' }
  }

  return { success: true }
}

export async function recordConsentForReusableLink(
  token: string,
  name: string
): Promise<{ success?: boolean; error?: string }> {
  const admin = getAdmin()

  // Look up campaign by reusable_invite_token
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, org_id, status')
    .eq('reusable_invite_token', token)
    .eq('reusable_invite_enabled', true)
    .single()

  if (!campaign) {
    return { error: 'invalid' }
  }

  if (campaign.status === 'archived') {
    return { error: 'campaign_archived' }
  }

  // Create new respondent with consent (T-02-13)
  const { error } = await admin.from('respondents').insert({
    campaign_id: campaign.id,
    org_id: campaign.org_id,
    name,
    email: null,
    status: 'in_progress',
    consent_given_at: new Date().toISOString(),
  })

  if (error) {
    return { error: 'No se pudo registrar el consentimiento. Intenta de nuevo.' }
  }

  return { success: true }
}
