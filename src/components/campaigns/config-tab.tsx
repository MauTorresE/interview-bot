'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateCampaignConfig } from '@/app/(dashboard)/campaigns/[id]/actions'
import { LANGUAGES, DURATION_OPTIONS, VOICE_PERSONAS } from '@/lib/constants/campaign'
import { VoicePersonaList } from './voice-persona-list'
import { StyleToggle } from './style-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Loader2 } from 'lucide-react'

type Campaign = {
  id: string
  name: string
  description: string | null
  language: string
  duration_target_minutes: number
  voice_provider: string | null
  voice_id: string | null
  interviewer_style: string | null
  reusable_invite_token: string | null
  reusable_invite_enabled: boolean
}

type ConfigTabProps = {
  campaign: Campaign
}

type DetailsForm = {
  name: string
  description: string
  language: string
  duration_target_minutes: string
}

export function ConfigTab({ campaign }: ConfigTabProps) {
  const [voiceId, setVoiceId] = useState<string | null>(campaign.voice_id)
  const [style, setStyle] = useState(campaign.interviewer_style || 'professional')
  const [reusableEnabled, setReusableEnabled] = useState(campaign.reusable_invite_enabled)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const { register, handleSubmit, formState } = useForm<DetailsForm>({
    defaultValues: {
      name: campaign.name,
      description: campaign.description ?? '',
      language: campaign.language,
      duration_target_minutes: campaign.duration_target_minutes.toString(),
    },
  })

  // Track dirty state for non-form fields
  function markDirty() {
    if (!isDirty) setIsDirty(true)
  }

  function handleVoiceSelect(id: string) {
    setVoiceId(id)
    markDirty()
  }

  function handleStyleChange(value: string) {
    setStyle(value)
    markDirty()
  }

  function handleReusableToggle(checked: boolean) {
    setReusableEnabled(checked)
    markDirty()
  }

  async function onSubmit(data: DetailsForm) {
    setIsSaving(true)

    const voiceProvider = voiceId
      ? VOICE_PERSONAS.find((v) => v.id === voiceId)?.provider ?? 'voxtral'
      : undefined

    const result = await updateCampaignConfig(campaign.id, {
      name: data.name,
      description: data.description || undefined,
      language: data.language,
      duration_target_minutes: parseInt(data.duration_target_minutes, 10),
      voice_provider: voiceProvider,
      voice_id: voiceId ?? undefined,
      interviewer_style: style,
      reusable_invite_enabled: reusableEnabled,
    })

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Configuracion guardada')
      setIsDirty(false)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/interview/${campaign.reusable_invite_token}`
    navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  const isFormDirty = formState.isDirty || isDirty

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-2xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Configuracion</h2>
        <Button type="submit" disabled={isSaving || !isFormDirty}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              {isFormDirty && (
                <span className="mr-2 size-1.5 rounded-full bg-primary-foreground" />
              )}
              Guardar
            </>
          )}
        </Button>
      </div>

      {/* Section 1: Detalles */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="config-name">Nombre</Label>
            <Input
              id="config-name"
              {...register('name', { required: true })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-description">Descripcion</Label>
            <Textarea
              id="config-description"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Idioma</Label>
              <Select
                defaultValue={campaign.language}
                onValueChange={(value) => {
                  // Update react-hook-form manually
                  const event = { target: { name: 'language', value } }
                  register('language').onChange(event)
                  markDirty()
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Duracion</Label>
              <Select
                defaultValue={campaign.duration_target_minutes.toString()}
                onValueChange={(value) => {
                  const event = { target: { name: 'duration_target_minutes', value } }
                  register('duration_target_minutes').onChange(event)
                  markDirty()
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Voz del entrevistador */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            Voz del entrevistador
          </h3>
          <VoicePersonaList
            selectedVoiceId={voiceId}
            onSelect={handleVoiceSelect}
          />
        </CardContent>
      </Card>

      {/* Section 3: Estilo de entrevista */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            Estilo de entrevista
          </h3>
          <StyleToggle
            selectedStyle={style}
            onStyleChange={handleStyleChange}
          />
        </CardContent>
      </Card>

      {/* Section 4: Enlace reutilizable */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-foreground">
            Enlace reutilizable
          </h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="reusable-toggle">Permitir enlace compartido</Label>
            <Switch
              id="reusable-toggle"
              checked={reusableEnabled}
              onCheckedChange={handleReusableToggle}
            />
          </div>
          {reusableEnabled && campaign.reusable_invite_token && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
              <code className="flex-1 truncate text-xs text-muted-foreground">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/interview/${campaign.reusable_invite_token}`
                  : `/interview/${campaign.reusable_invite_token}`}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={handleCopyLink}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  )
}
