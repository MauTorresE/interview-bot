import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { InterviewFlowWrapper } from './interview-flow-wrapper'

type PageProps = {
  params: Promise<{ token: string }>
}

async function lookupToken(token: string) {
  const admin = createAdminClient()

  // Check respondents table for invite_token (direct link)
  const { data: respondent } = await admin
    .from('respondents')
    .select('id, status, campaign_id')
    .eq('invite_token', token)
    .single()

  if (respondent) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, name, status')
      .eq('id', respondent.campaign_id)
      .single()

    // Check if respondent has an active interview (for rejoin on refresh)
    let activeInterview: { id: string } | null = null
    if (respondent.status === 'in_progress') {
      const { data: interview } = await admin
        .from('interviews')
        .select('id')
        .eq('respondent_id', respondent.id)
        .eq('status', 'active')
        .maybeSingle()
      activeInterview = interview as { id: string } | null
    }

    return {
      valid: true as const,
      type: 'respondent' as const,
      respondentId: respondent.id as string,
      campaignName: (campaign?.name as string) ?? 'Entrevista',
      status: respondent.status as string,
      campaignStatus: (campaign?.status as string) ?? null,
      activeInterviewId: activeInterview?.id ?? null,
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
      respondentId: null,
      campaignName: campaign.name as string,
      status: null,
      campaignStatus: campaign.status as string,
      activeInterviewId: null,
    }
  }

  return {
    valid: false as const,
    type: null,
    respondentId: null,
    campaignName: null,
    status: null,
    campaignStatus: null,
    activeInterviewId: null,
  }
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

  // Completed interview — show thank you
  if (result.type === 'respondent' && result.status === 'completed') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <Card className="w-full max-w-[480px]">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <span className="text-xl font-semibold text-primary">EntrevistaAI</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-3">
              Entrevista completada
            </h1>
            <p className="text-sm text-muted-foreground">
              Gracias por tu tiempo. El investigador recibira tus insights pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dropped interview
  if (result.type === 'respondent' && result.status === 'dropped') {
    return (
      <Card className="w-full max-w-[560px]">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Sesion finalizada
          </h1>
          <p className="text-sm text-muted-foreground">
            Esta sesion de entrevista ha finalizado. Contacta al investigador si necesitas una nueva sesion.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Valid token — render interview flow
  // Pass activeInterviewId so the flow wrapper can skip consent/lobby and rejoin directly
  return (
    <InterviewFlowWrapper
      inviteToken={token}
      tokenType={result.type}
      campaignName={result.campaignName}
      activeInterviewId={result.activeInterviewId}
      respondentId={result.respondentId}
    />
  )
}
