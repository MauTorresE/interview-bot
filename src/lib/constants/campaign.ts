export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number]

export const RESPONDENT_STATUSES = ['invited', 'in_progress', 'completed', 'dropped'] as const
export type RespondentStatus = typeof RESPONDENT_STATUSES[number]

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  archived: 'Archivada',
}

export const RESPONDENT_STATUS_LABELS: Record<RespondentStatus, string> = {
  invited: 'Invitado',
  in_progress: 'En progreso',
  completed: 'Completado',
  dropped: 'Abandonado',
}

export const INTERVIEWER_STYLES = [
  { value: 'professional', label: 'Profesional', description: 'Tono formal y estructurado. Ideal para investigación corporativa.' },
  { value: 'casual', label: 'Casual', description: 'Tono conversacional y relajado. Ideal para estudios de consumidor.' },
  { value: 'empathetic', label: 'Empático', description: 'Tono cálido y comprensivo. Ideal para temas sensibles.' },
  { value: 'direct', label: 'Directo', description: 'Tono conciso y enfocado. Ideal para entrevistas cortas.' },
] as const

export const VOICE_PERSONAS = [
  { id: 'voxtral-natalia', name: 'Natalia', provider: 'voxtral', premium: false },
  { id: 'voxtral-diego', name: 'Diego', provider: 'voxtral', premium: false },
  { id: 'elevenlabs-sofia', name: 'Sofia', provider: 'elevenlabs', premium: true },
  { id: 'elevenlabs-marco', name: 'Marco', provider: 'elevenlabs', premium: true },
] as const

export const LANGUAGES = [
  { value: 'es-419', label: 'Español (Latinoamérica)' },
  { value: 'es-ES', label: 'Español (España)' },
] as const

export const DURATION_OPTIONS = [
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
] as const
