import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { ConsentForm } from './consent-form'

type PageProps = {
  params: Promise<{ token: string }>
}

async function lookupToken(token: string) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check respondents table for invite_token (T-02-11: only returns campaign name)
  const { data: respondent } = await admin
    .from('respondents')
    .select('id, status, campaign_id, campaigns(id, name, status)')
    .eq('invite_token', token)
    .single()

  if (respondent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaign = respondent.campaigns as any
    return {
      valid: true as const,
      type: 'respondent' as const,
      campaignName: campaign?.name as string ?? 'Entrevista',
      status: respondent.status as string,
      campaignStatus: campaign?.status as string,
    }
  }

  // Check campaigns table for reusable_invite_token
  const { data: campaign } = await admin
    .from('campaigns')
    .select('id, name, status')
    .eq('reusable_invite_token', token)
    .eq('reusable_invite_enabled', true)
    .single()

  if (campaign) {
    return {
      valid: true as const,
      type: 'campaign' as const,
      campaignName: campaign.name as string,
      status: null,
      campaignStatus: campaign.status as string,
    }
  }

  return { valid: false as const, type: null, campaignName: null, status: null, campaignStatus: null }
}

export default async function InterviewConsentPage({ params }: PageProps) {
  const { token } = await params
  const result = await lookupToken(token)

  // Invalid token
  if (!result.valid) {
    return (
      <Card className="w-full max-w-[560px]">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Enlace no valido
          </h1>
          <p className="text-sm text-muted-foreground">
            Este enlace de entrevista no es valido o ha expirado.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Already used token
  if (result.type === 'respondent' && result.status !== 'invited') {
    return (
      <Card className="w-full max-w-[560px]">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Enlace ya utilizado
          </h1>
          <p className="text-sm text-muted-foreground">
            Este enlace de entrevista ya fue utilizado. Contacta al investigador para obtener un nuevo enlace.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Archived campaign
  if (result.campaignStatus === 'archived') {
    return (
      <Card className="w-full max-w-[560px]">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Enlace no valido
          </h1>
          <p className="text-sm text-muted-foreground">
            Este enlace de entrevista no es valido o ha expirado.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Valid token -- render consent form
  return (
    <ConsentForm
      token={token}
      tokenType={result.type}
      campaignName={result.campaignName}
    />
  )
}
