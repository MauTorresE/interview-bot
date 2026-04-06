'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/campaigns/status-badge'
import {
  LANGUAGES,
  VOICE_PERSONAS,
  INTERVIEWER_STYLES,
} from '@/lib/constants/campaign'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale/es'

type Respondent = {
  id: string
  name: string
  status: string
  created_at: string
}

type Campaign = {
  id: string
  name: string
  status: string
  language: string
  duration_target_minutes: number
  voice_id: string | null
  interviewer_style: string | null
  created_at: string
}

type SummaryTabProps = {
  campaign: Campaign
  respondents: Respondent[]
}

export function SummaryTab({ campaign, respondents }: SummaryTabProps) {
  const completedCount = respondents.filter((r) => r.status === 'completed').length
  const totalCount = respondents.length
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const languageLabel =
    LANGUAGES.find((l) => l.value === campaign.language)?.label ?? campaign.language

  const voiceName = campaign.voice_id
    ? VOICE_PERSONAS.find((v) => v.id === campaign.voice_id)?.name ?? 'Sin asignar'
    : 'Sin asignar'

  const styleLabel = campaign.interviewer_style
    ? INTERVIEWER_STYLES.find((s) => s.value === campaign.interviewer_style)?.label ?? campaign.interviewer_style
    : 'Sin asignar'

  const recentRespondents = respondents.slice(0, 5)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={campaign.status} variant="campaign" />
        <span className="text-sm text-muted-foreground">
          Creada: {format(parseISO(campaign.created_at), 'd MMM yyyy', { locale: es })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.67fr] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Progress card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressValue} />
              <p className="mt-2 text-sm text-muted-foreground">
                {completedCount} de {totalCount} entrevistas
              </p>
            </CardContent>
          </Card>

          {/* Activity card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actividad reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRespondents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad aún</p>
              ) : (
                <div className="space-y-3">
                  {recentRespondents.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                      </div>
                      <StatusBadge status={r.status} variant="respondent" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(parseISO(r.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Info rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Idioma</p>
                <p className="text-sm">{languageLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Duración</p>
                <p className="text-sm">{campaign.duration_target_minutes} min</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Voz</p>
                <p className="text-sm">{voiceName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Estilo</p>
                <p className="text-sm">{styleLabel}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
