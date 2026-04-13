import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { InterviewFlowWrapper } from './interview-flow-wrapper'
import { AlreadyCompletedCard } from '@/components/interview/already-completed-card'

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

    // Wave 2.4: if the respondent has already completed, pull the latest
    // completed interview row so we can show the summary on the thank-you
    // card. Columns `closing_summary` and `closing_reason` were added in
    // migration 006; tolerate the case where they're missing (e.g., pre-
    // migration rows or failed closes).
    let completedInterview: {
      endedAt?: string | null
      durationSeconds?: number | null
      topicsCount?: number | null
      closingSummary?: string | null
      closingReason?: string | null
    } | null = null
    if (respondent.status === 'completed') {
      const { data: latest } = await admin
        .from('interviews')
        .select('ended_at, duration_seconds, topics_count, closing_summary, closing_reason')
        .eq('respondent_id', respondent.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latest) {
        const row = latest as Record<string, unknown>
        completedInterview = {
          endedAt: (row.ended_at as string | null) ?? null,
          durationSeconds: (row.duration_seconds as number | null) ?? null,
          topicsCount: (row.topics_count as number | null) ?? null,
          closingSummary: (row.closing_summary as string | null) ?? null,
          closingReason: (row.closing_reason as string | null) ?? null,
        }
      }
    }

    return {
      valid: true as const,
      type: 'respondent' as const,
      respondentId: respondent.id as string,
      campaignName: (campaign?.name as string) ?? 'Entrevista',
      status: respondent.status as string,
      campaignStatus: (campaign?.status as string) ?? null,
      activeInterviewId: activeInterview?.id ?? null,
      completedInterview,
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
      completedInterview: null,
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
    completedInterview: null,
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

  // Wave 2.4: completed interview — show the AlreadyCompletedCard with the
  // stored closing_summary from the interviews row (Wave 1.7 migration 006).
  if (result.type === 'respondent' && result.status === 'completed') {
    return (
      <AlreadyCompletedCard
        campaignName={result.campaignName}
        completedAt={result.completedInterview?.endedAt ?? null}
        durationSeconds={result.completedInterview?.durationSeconds ?? null}
        topicsCount={result.completedInterview?.topicsCount ?? null}
        summaryText={result.completedInterview?.closingSummary ?? null}
        closingReason={result.completedInterview?.closingReason ?? null}
      />
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
